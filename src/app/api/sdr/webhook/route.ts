/**
 * POST /api/sdr/webhook
 * ─────────────────────────────────────────────────────────────────────────────
 * Recebe mensagens da Meta Cloud API (WhatsApp Business oficial).
 *
 * Para ativar:
 *  1. Configure WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN e
 *     WHATSAPP_PHONE_NUMBER_ID no painel da Vercel ou .env.
 *  2. Registre este endpoint no Meta Developer Console (WhatsApp > Configuração).
 *  3. Ative o SDR na tabela SdrConfig para o corretor desejado.
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

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'synapse-sdr-token';

// ── GET — verificação do webhook pela Meta (WhatsApp Business) ───────────────
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode      = params.get('hub.mode');
  const token     = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── POST — recebe mensagens do WhatsApp (Meta Cloud API) ─────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Estrutura padrão Meta Webhook
    const entry    = body?.entry?.[0];
    const changes  = entry?.changes?.[0];
    const value    = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'ok' }); // heartbeat / status update
    }

    const msg      = messages[0];
    const phone    = msg?.from;
    const text     = msg?.text?.body?.trim() || '';
    const pushName = value?.contacts?.[0]?.profile?.name || undefined;

    if (!phone || !text) return NextResponse.json({ status: 'ok' });

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
      // Primeira mensagem — cria lead e conversa
      const lead = await prisma.lead.create({
        data: {
          name:         pushName || phone,
          phone,
          source:       'WHATSAPP',
          interest:     'AUTO',
          status:       'NOVO',
          temp:         'MORNO',
          orgId:        config.orgId,
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
          orgId:    config.orgId,
          ownerId:  config.ownerId,
          phone,
          channel:  'WHATSAPP',
          state:    'GREETING',
          messages: firstMessages,
          score:    0,
          active:   true,
        },
      });

      // Envia mensagem de boas-vindas
      await sendWhatsAppMessage(phone, DEFAULT_MESSAGES.GREETING);
      return NextResponse.json({ status: 'ok' });
    }

    // Conversa existente — processa mensagem
    const currentMessages = (conversation.messages as SdrMessage[]) || [];
    const userMsg: SdrMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };

    // Recupera contexto do lead
    const lead = await prisma.lead.findUnique({ where: { id: conversation.leadId } });
    if (!lead) return NextResponse.json({ status: 'ok' });

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
          orgId:       config.orgId,
          ownerId:     config.ownerId,
        },
      });
    }

    // Envia resposta ao WhatsApp
    await sendWhatsAppMessage(phone, botMessage);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[SDR Webhook]', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// ── Envia mensagem via Meta Cloud API ────────────────────────────────────────
async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    // Modo dev: apenas loga no console da Vercel / terminal
    console.log(`[Meta WhatsApp SDR → ${to}]`, text);
    return;
  }

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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
