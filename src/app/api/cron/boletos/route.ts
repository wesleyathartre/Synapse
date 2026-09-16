/**
 * GET /api/cron/boletos
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron diário: marca boletos vencidos como VENCIDO.
 *
 * Regra:
 *  - PENDENTE com dueDate < hoje → VENCIDO
 *
 * Proteção: header Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail-closed: em produção exige o segredo. Sem segredo só passa fora de produção (dev local).
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();

  const result = await prisma.boleto.updateMany({
    where: {
      status: 'PENDENTE',
      dueDate: { lt: now },
    },
    data: { status: 'VENCIDO' },
  });

  return NextResponse.json({
    ok: true,
    updated: result.count,
    runAt: now.toISOString(),
  });
}
