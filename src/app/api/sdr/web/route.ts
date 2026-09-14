/**
 * POST /api/sdr/web
 * ─────────────────────────────────────────────────────────────────────────────
 * Canal WEB do Synapse SDR — roda a MESMA engine de qualificação do WhatsApp,
 * porém 100% pelo navegador (chat no site). Não depende da Meta/WhatsApp e não
 * tem custo por mensagem. Ideal para o formulário/chat da Landing Page e demos.
 *
 * Fluxo: o widget envia { sessionId?, message }. Na primeira mensagem (sem
 * sessionId) cria o Lead + a conversa e devolve o sessionId para as próximas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/audit';
import {
  processUserMessage,
  generateHandoffSummary,
  DEFAULT_MESSAGES,
  type SdrContext,
  type SdrMessage,
  type SdrState,
} from '@/lib/sdr-engine';

const WEB_PLACEHOLDER_NAME = 'Visitante (site)';

function corsHeaders(): Record<string, string> {
  const origin = process.env.LANDING_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();
  const ip = getClientIp(req);

  const rl = rateLimit(`sdr-web:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitas mensagens em pouco tempo. Aguarde alguns instantes.' },
      { status: 429, headers },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const message = String(body.message || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400, headers });
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400, headers });
  }

  // Destinatário padrão do lead: primeiro ADMIN ativo (fallback: primeiro usuário ativo).
  const owner =
    (await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, orderBy: { createdAt: 'asc' } })) ||
    (await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }));
  if (!owner) {
    return NextResponse.json({ error: 'Nenhum atendente configurado.' }, { status: 503, headers });
  }

  // Recupera a conversa ativa deste sessionId (se houver).
  let conversation = sessionId
    ? await prisma.sdrConversation.findFirst({ where: { id: sessionId, channel: 'WEB', active: true } })
    : null;

  let lead = conversation
    ? await prisma.lead.findUnique({ where: { id: conversation.leadId } })
    : null;

  // Primeira mensagem: cria o lead e a conversa.
  if (!conversation || !lead) {
    const webId = `site:${crypto.randomUUID()}`;
    lead = await prisma.lead.create({
      data: {
        name: WEB_PLACEHOLDER_NAME,
        phone: webId,
        source: 'SITE',
        interest: 'AUTO',
        status: 'NOVO',
        temp: 'MORNO',
        notes: 'Origem: Chat SDR (site)',
        ownerId: owner.id,
        sdrStatus: 'EM_TRIAGEM',
        sdrChannel: 'WEB',
        sdrStartedAt: new Date(),
      },
    });

    const firstMessages: SdrMessage[] = [
      { role: 'bot', content: DEFAULT_MESSAGES.GREETING, timestamp: new Date().toISOString() },
    ];

    conversation = await prisma.sdrConversation.create({
      data: {
        leadId: lead.id,
        ownerId: owner.id,
        phone: webId,
        channel: 'WEB',
        state: 'GREETING',
        messages: firstMessages,
        score: 0,
        active: true,
      },
    });
  }

  // Reconstrói o contexto a partir do lead + conversa.
  const ctx: SdrContext = {
    score: conversation.score,
    intention: lead.sdrIntention || undefined,
    interest: lead.sdrNeed || undefined,
    need: lead.sdrNeed || undefined,
    deadline: lead.sdrDeadline || undefined,
    name: lead.name !== WEB_PLACEHOLDER_NAME ? lead.name : undefined,
    city: lead.sdrCity || undefined,
    classification: conversation.classification || undefined,
  };

  const { nextState, updatedCtx, botMessage } = processUserMessage(
    conversation.state as SdrState,
    message,
    ctx,
  );

  const currentMessages = (conversation.messages as unknown as SdrMessage[]) || [];
  const userMsg: SdrMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
  const botMsg: SdrMessage = { role: 'bot', content: botMessage, timestamp: new Date().toISOString() };
  const updatedMessages = [...currentMessages, userMsg, botMsg];

  const isHandoff = nextState === 'HANDOFF';
  const handoffPhone = 'via chat do site';

  await prisma.$transaction([
    prisma.sdrConversation.update({
      where: { id: conversation.id },
      data: {
        state: nextState,
        messages: updatedMessages,
        score: updatedCtx.score,
        classification: updatedCtx.classification,
        active: nextState !== 'CLOSED',
        transferredAt: isHandoff ? new Date() : undefined,
      },
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: updatedCtx.name || lead.name,
        sdrStatus: isHandoff ? 'TRANSFERIDO' : 'EM_TRIAGEM',
        sdrScore: updatedCtx.score,
        sdrClassification: updatedCtx.classification,
        sdrIntention: updatedCtx.intention,
        sdrNeed: updatedCtx.need,
        sdrDeadline: updatedCtx.deadline,
        sdrCity: updatedCtx.city,
        sdrSummary: isHandoff ? generateHandoffSummary(updatedCtx, handoffPhone) : undefined,
        sdrTransferredAt: isHandoff ? new Date() : undefined,
        temp:
          updatedCtx.classification === 'QUENTE' ? 'QUENTE'
          : updatedCtx.classification === 'MORNO' ? 'MORNO'
          : 'FRIO',
      },
    }),
  ]);

  // No handoff, cria a tarefa prioritária para o corretor.
  if (isHandoff) {
    await prisma.activity.create({
      data: {
        type: 'TAREFA',
        title: `🔥 Lead qualificado via SDR Web — ${updatedCtx.classification || 'Novo'} (Score: ${updatedCtx.score})`,
        description: generateHandoffSummary(updatedCtx, handoffPhone),
        dueDate: new Date(),
        done: false,
        ownerId: owner.id,
        leadId: lead.id,
      },
    });
  }

  return NextResponse.json(
    {
      sessionId: conversation.id,
      reply: botMessage,
      state: nextState,
      score: updatedCtx.score,
      classification: updatedCtx.classification || null,
      done: nextState === 'HANDOFF' || nextState === 'CLOSED',
    },
    { status: 200, headers },
  );
}
