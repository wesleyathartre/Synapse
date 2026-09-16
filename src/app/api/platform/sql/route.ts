import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

const MAX_ROWS = 1000;

// Comandos que apenas leem: rodam direto, sem confirmação.
const READ_ONLY_START = /^(SELECT|EXPLAIN|SHOW)\b/i;
// Bloqueio duro: destruição irrecuperável do banco inteiro.
const HARD_BLOCK = /\b(DROP\s+DATABASE|DROP\s+SCHEMA)\b/i;

// Converte BigInt (ex.: COUNT) para string para o JSON não quebrar.
function serialize(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

// POST /api/platform/sql — console SQL do OWNER (leitura direta; escrita com confirmação)
export async function POST(req: NextRequest) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const query = String(body.query || '').trim();
  const confirm = body.confirm === true;

  if (!query) return NextResponse.json({ error: 'Digite uma consulta.' }, { status: 400 });
  if (HARD_BLOCK.test(query)) {
    return NextResponse.json(
      { error: 'Comando bloqueado por segurança (DROP DATABASE/SCHEMA).' },
      { status: 400 },
    );
  }

  const isRead = READ_ONLY_START.test(query);

  // Escrita precisa de confirmação explícita do usuário.
  if (!isRead && !confirm) {
    return NextResponse.json({ type: 'write', needsConfirm: true });
  }

  try {
    if (isRead) {
      const rows = (await prisma.$queryRawUnsafe(query)) as Record<string, unknown>[];
      const list = Array.isArray(rows) ? rows : [];
      const truncated = list.length > MAX_ROWS;
      const shown = truncated ? list.slice(0, MAX_ROWS) : list;
      const columns = shown.length > 0 ? Object.keys(shown[0]) : [];
      return NextResponse.json({
        type: 'read',
        columns,
        rows: serialize(shown),
        rowCount: list.length,
        truncated,
      });
    }

    // Escrita confirmada.
    const affected = await prisma.$executeRawUnsafe(query);
    await audit({
      action: 'PLATFORM_SQL_WRITE',
      userId: guard.session.id,
      email: guard.session.email,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      meta: { query, affected },
    });
    return NextResponse.json({ type: 'write', affected });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao executar a consulta.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
