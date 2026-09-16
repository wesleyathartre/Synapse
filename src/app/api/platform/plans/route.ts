import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { isPlanCode } from '@/lib/plans';
import { listPlans } from '@/lib/plans-service';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// GET /api/platform/plans — planos atuais (padrão do código + edições do OWNER)
export async function GET() {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const plans = await listPlans();
  return NextResponse.json({ plans });
}

// PUT /api/platform/plans — edita label/preço/limite de um plano (somente OWNER)
export async function PUT(req: NextRequest) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').toUpperCase();

  if (!isPlanCode(code)) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
  }

  const label = String(body.label ?? '').trim();
  if (!label) return NextResponse.json({ error: 'Informe o nome do plano.' }, { status: 400 });

  const seatLimit = Number(body.seatLimit);
  if (!Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > 999) {
    return NextResponse.json({ error: 'Limite de usuários inválido (1 a 999).' }, { status: 400 });
  }

  const priceMonthly = Number(body.priceMonthly);
  if (!Number.isInteger(priceMonthly) || priceMonthly < 0 || priceMonthly > 1_000_000) {
    return NextResponse.json({ error: 'Preço mensal inválido.' }, { status: 400 });
  }

  const saved = await prisma.plan.upsert({
    where: { code },
    create: { code, label, seatLimit, priceMonthly },
    update: { label, seatLimit, priceMonthly },
  });

  await audit({
    action: 'PLATFORM_UPDATE_PLAN',
    userId: guard.session.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { code, label, seatLimit, priceMonthly },
  });

  return NextResponse.json({
    plan: {
      code: saved.code,
      label: saved.label,
      seatLimit: saved.seatLimit,
      priceMonthly: saved.priceMonthly,
    },
  });
}
