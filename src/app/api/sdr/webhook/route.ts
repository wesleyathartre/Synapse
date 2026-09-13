/**
 * POST /api/sdr/webhook
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint para recebimento de mensagens do WhatsApp.
 * Suporta primariamente a Evolution API (event: messages.upsert),
 * com simulação de digitação, detecção de pushName e filtros anti-loop.
 * Também mantém compatibilidade de fallback com a Meta Cloud API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  processUserMessage,
  generateHandoffSummary,
  DEFAULT_MESSAGES,
  type SdrContext,
  type SdrMessage,
} from '@/lib/sdr-engine';
import {
  sendEvolutionTextMessage,
  sanitizeWhatsAppNumber,
} from '@/lib/evolution-api';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'synapse-sdr-token';

// ── GET — verificação / healthcheck do webhook ────────────────────────────────
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode      = params.get('hub.mode');
  const token     = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  // Suporte à validação legada da Meta
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  // Healthcheck padrão para Evolution API ou navegadores
  return NextResponse.json(
    { status: 'online', service: 'Synapse SDR Webhook', provider: 'Evolution API' },
    { status: 200 }
  );
}

// ── POST — recebe mensagens do WhatsApp ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let phone = '';
    let text = '';
    let pushName: string | undefined = undefined;

    // ── 1. Formato Evolution API (messages.upsert) ────────────────────────────
    const isEvolution =
      body?.event === 'messages.upsert' ||
      body?.event === 'messages' ||
      Boolean(body?.data?.key);

    if (isEvolution) {
      const data = Array.isArray(body?.data) ? body.data[0] : body?.data;
      if (!data) return NextResponse.json({ status: 'ignored_empty' });

      const key = data?.key;
      // Ignora mensagens enviadas pelo próprio corretor (evita loop)
      if (key?.fromMe) {
        return NextResponse.json({ status: 'ignored_from_me' });
      }

      const remoteJid: string = key?.remoteJid || '';
      // Ignora mensagens de grupos do WhatsApp (@g.us) e broadcasts (@broadcast)
      if (remoteJid.endsWith('@g.us') || remoteJid.includes('status@broadcast')) {
        return NextResponse.json({ status: 'ignored_group' });
      }

      phone = sanitizeWhatsAppNumber(remoteJid);
      pushName = data?.pushName || undefined;

      // Extrai o texto da mensagem nos diversos formatos possíveis da Evolution API
      const msg = data?.message;
      text =
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.buttonsResponseMessage?.selectedButtonId ||
        msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        '';
      text = text.trim();
    }
    // ── 2. Fallback: Formato Meta Cloud API ────────────────────────────────────
    else if (body?.entry?.[0]?.changes?.[0]?.value?.messages) {
      const metaMsg = body.entry[0].changes[0].value.messages[0];
      phone = sanitizeWhatsAppNumber(metaMsg?.from || '');
      text = metaMsg?.text?.body?.trim() || '';
      pushName = body.entry[0].changes[0].value?.contacts?.[0]?.profile?.name || undefined;
    }

    // Se não houver remetente ou texto (ex: evento de status, confirmação de leitura), ignora
    if (!phone || !text) {
      return NextResponse.json({ status: 'ignored_no_text' });
    }

    // Busca configuração ativa do SDR
    const config = await prisma.sdrConfig.findFirst({ where: { active: true } });
    if (!config) {
      // SDR desativado — ignora silenciosamente
      return NextResponse.json({ status: 'sdr_inactive' });
    }

    // Busca conversa ativa para este número
    let conversation = await prisma.sdrConversation.findFirst({
      where: { phone, active: true, ownerId: config.ownerId },
    });

    if (!conversation) {
      // Primeira mensagem — cria lead e conversa com o pushName detectado
      const lead = await prisma.lead.create({
        data: {
          name:         pushName || phone,
          phone,
          source:       'WHATSAPP',
          interest:     'AUTO',
          status:       'NOVO',
          temp:         'MORNO',
          ownerId:      config.ownerId,
          sdrStatus:    'EM_TRIAGEM',
          sdrChannel:   'WHATSAPP',
          sdrStartedAt: new Date(),
        },
      });

      const firstMessages: SdrMessage[] = [
        { role: 'bot', content: DEFAULT_MESSAGES.GREETING, timestamp: new Date().toISOString() },
      ];

      conversation = await prisma.sdrConversation.create({
        data: {
          leadId:   lead.id,
          ownerId:  config.ownerId,
          phone,
          channel:  'WHATSAPP',
          state:    'GREETING',
          messages: firstMessages,
          score:    0,
          active:   true,
        },
      });

      // Envia mensagem de boas-vindas com delay de digitação
      await sendReply(phone, DEFAULT_MESSAGES.GREETING);
      return NextResponse.json({ status: 'ok', action: 'conversation_started' });
    }

    // Conversa existente — processa mensagem
    const currentMessages = (conversation.messages as SdrMessage[]) || [];
    const userMsg: SdrMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };

    // Recupera contexto do lead
    const lead = await prisma.lead.findUnique({ where: { id: conversation.leadId } });
    if (!lead) return NextResponse.json({ status: 'ok' });

    // Atualiza o nome se o lead tinha apenas o telefone e agora temos pushName
    const resolvedName = (lead.name === phone && pushName) ? pushName : (lead.name !== phone ? lead.name : undefined);

    const ctx: SdrContext = {
      score:          conversation.score,
      intention:      lead.sdrIntention || undefined,
      interest:       lead.sdrNeed      || undefined,
      need:           lead.sdrNeed      || undefined,
      deadline:       lead.sdrDeadline  || undefined,
      name:           resolvedName,
      city:           lead.sdrCity      || undefined,
      classification: conversation.classification || undefined,
    };

    const { nextState, updatedCtx, botMessage } = processUserMessage(
      conversation.state as any,
      text,
      ctx,
    );

    const botMsg: SdrMessage = { role: 'bot', content: botMessage, timestamp: new Date().toISOString() };
    const updatedMessages = [...currentMessages, userMsg, botMsg];

    // Persiste conversa e lead
    await prisma.$transaction([
      prisma.sdrConversation.update({
        where: { id: conversation.id },
        data: {
          state:          nextState,
          messages:       updatedMessages,
          score:          updatedCtx.score,
          classification: updatedCtx.classification,
          active:         nextState !== 'CLOSED',
          transferredAt:  nextState === 'HANDOFF' ? new Date() : undefined,
        },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          name:              updatedCtx.name || resolvedName || lead.name,
          sdrStatus:         nextState === 'HANDOFF' ? 'TRANSFERIDO' : 'EM_TRIAGEM',
          sdrScore:          updatedCtx.score,
          sdrClassification: updatedCtx.classification,
          sdrIntention:      updatedCtx.intention,
          sdrNeed:           updatedCtx.need,
          sdrDeadline:       updatedCtx.deadline,
          sdrCity:           updatedCtx.city,
          sdrSummary:        nextState === 'HANDOFF'
            ? generateHandoffSummary(updatedCtx, phone)
            : undefined,
          sdrTransferredAt:  nextState === 'HANDOFF' ? new Date() : undefined,
          temp:              updatedCtx.classification === 'QUENTE' ? 'QUENTE'
            : updatedCtx.classification === 'MORNO' ? 'MORNO'
            : 'FRIO',
        },
      }),
    ]);

    // Se for handoff, cria tarefa para o corretor
    if (nextState === 'HANDOFF') {
      await prisma.activity.create({
        data: {
          type:        'WHATSAPP',
          title:       `🔥 Lead qualificado via SDR — ${updatedCtx.classification || 'Novo'} (Score: ${updatedCtx.score})`,
          description: generateHandoffSummary(updatedCtx, phone),
          dueDate:     new Date(),
          done:        false,
          ownerId:     config.ownerId,
        },
      });
    }

    // Envia resposta ao WhatsApp
    await sendReply(phone, botMessage);

    return NextResponse.json({ status: 'ok', nextState });
  } catch (error) {
    console.error('[SDR Webhook]', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// ── Despachador de resposta (Evolution API primária com fallback Meta) ────────
async function sendReply(to: string, text: string): Promise<void> {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const metaToken    = process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneId  = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // 1. Se Evolution API estiver configurada (ou em modo dev padrão), usa Evolution
  if (evolutionUrl || (!metaToken && !metaPhoneId)) {
    await sendEvolutionTextMessage({
      to,
      text,
      delayMs: 1500, // 1.5s de delay simulando digitação
    });
    return;
  }

  // 2. Fallback para Meta Cloud API se credenciais da Meta estiverem presentes
  if (metaToken && metaPhoneId) {
    await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${metaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
  }
}
