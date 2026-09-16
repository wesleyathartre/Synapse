import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { isPlanCode, seatLimitForPlan, isOrgStatus } from '@/lib/plans';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// GET /api/platform/orgs/[id] — detalhe da corretora (somente OWNER)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { users: true } },
    },
  });
  if (!org) return NextResponse.json({ error: 'Corretora não encontrada.' }, { status: 404 });

  return NextResponse.json({ org });
}

// PATCH /api/platform/orgs/[id] — ativa/suspende, troca plano/nome (somente OWNER)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const org = await prisma.organization.findUnique({ where: { id: params.id } });
  if (!org) return NextResponse.json({ error: 'Corretora não encontrada.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();

  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!isOrgStatus(status)) return NextResponse.json({ error: 'Situação inválida.' }, { status: 400 });
    data.status = status;
    // Ao ativar manualmente, encerra o período de trial.
    if (status === 'ACTIVE') data.trialEndsAt = null;
  }

  if (body.plan !== undefined) {
    const plan = String(body.plan).toUpperCase();
    if (!isPlanCode(plan)) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    data.plan = plan;
    // Ao trocar de plano, ajusta o limite de assentos ao padrão do plano.
    data.seatLimit = seatLimitForPlan(plan);
  }

  // Ajuste manual de assentos (ex.: usuários extras cobrados à parte).
  if (body.seatLimit !== undefined) {
    const n = Number(body.seatLimit);
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      return NextResponse.json({ error: 'Limite de usuários inválido.' }, { status: 400 });
    }
    data.seatLimit = n;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const updated = await prisma.organization.update({ where: { id: params.id }, data });

  await audit({
    action: 'PLATFORM_UPDATE_ORG',
    userId: guard.session.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { orgId: params.id, changes: data },
  });

  return NextResponse.json({ org: updated });
}
