import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Diagnóstico temporário do provedor de IA (admin-only, NÃO expõe segredos).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const present = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
  };

  const checks: Record<string, unknown> = {};

  if (process.env.GROQ_API_KEY) {
    try {
      const list = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      });
      const listJson = await list.json().catch(() => null);
      const models = Array.isArray(listJson?.data)
        ? listJson.data.map((m: { id: string }) => m.id).sort()
        : listJson;
      checks.groqModels = { status: list.status, models };
    } catch (e) {
      checks.groqModels = { error: String(e).slice(0, 200) };
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'diga OK' }],
        }),
      });
      checks.groq = { status: res.status, body: (await res.text().catch(() => '')).slice(0, 300) };
    } catch (e) {
      checks.groq = { error: String(e).slice(0, 200) };
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'diga OK' }],
        }),
      });
      checks.openai = { status: res.status, body: (await res.text().catch(() => '')).slice(0, 300) };
    } catch (e) {
      checks.openai = { error: String(e).slice(0, 200) };
    }
  }

  return NextResponse.json({ present, checks });
}
