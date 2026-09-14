import { NextRequest, NextResponse } from 'next/server';
import { ownerScope } from '@/lib/scope';
import { answerQuestion } from '@/lib/assistant';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/assistant — responde perguntas consultando a base do usuário logado.
export async function POST(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // Teto de custo: no máximo 30 perguntas por hora por usuário.
  const rl = rateLimit(`assistant:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Você atingiu o limite de perguntas por agora. Tente novamente mais tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const question = String(body.question || '').trim();
  if (!question) return NextResponse.json({ error: 'Pergunta vazia.' }, { status: 400 });
  if (question.length > 500) return NextResponse.json({ error: 'Pergunta muito longa.' }, { status: 400 });

  const { answer, usedAI } = await answerQuestion(question, where);
  return NextResponse.json({ answer, usedAI });
}
