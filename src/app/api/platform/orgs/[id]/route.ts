import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { isPlanCode, isOrgStatus } from '@/lib/plans';
import { getSeatLimit } from '@/lib/plans-service';
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

  // Métricas de uso da corretora (contagens por orgId).
  const [leads, clients, policies] = await Promise.all([
    prisma.lead.count({ where: { orgId: params.id } }),
    prisma.client.count({ where: { orgId: params.id } }),
    prisma.policy.count({ where: { orgId: params.id } }),
  ]);

  // Último acesso = maior lastLoginAt entre os usuários da corretora.
  const lastLoginAt = org.users.reduce<Date | null>((max, u) => {
    if (u.lastLoginAt && (!max || u.lastLoginAt > max)) return u.lastLoginAt;
    return max;
  }, null);

  return NextResponse.json({ org, metrics: { leads, clients, policies, lastLoginAt } });
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
    data.seatLimit = await getSeatLimit(plan);
  }

  // Ajuste manual de assentos (ex.: usuários extras cobrados à parte).
  if (body.seatLimit !== undefined) {
    const n = Number(body.seatLimit);
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      return NextResponse.json({ error: 'Limite de usuários inválido.' }, { status: 400 });
    }
    data.seatLimit = n;
  }

  // Estender/definir (ou limpar) o fim do período de teste.
  if (body.trialEndsAt !== undefined) {
    if (body.trialEndsAt === null || body.trialEndsAt === '') {
      data.trialEndsAt = null;
    } else {
      const d = new Date(body.trialEndsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data de trial inválida.' }, { status: 400 });
      }
      data.trialEndsAt = d;
    }
  }

  // Anotações internas do OWNER (uso interno; a corretora nunca vê).
  if (body.internalNotes !== undefined) {
    data.internalNotes = String(body.internalNotes ?? '').slice(0, 5000) || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const updated = await prisma.organization.update({ where: { id: params.id }, data });

  await audit({
    action: 'PLATFORM_UPDATE_ORG',
    userId: guard.session.id,
    orgId: params.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { orgId: params.id, changes: data },
  });

  return NextResponse.json({ org: updated });
}
