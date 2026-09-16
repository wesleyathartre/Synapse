import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { seedOrgCatalog } from '@/lib/onboarding';
import { isPlanCode, seatLimitForPlan, isOrgStatus } from '@/lib/plans';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// GET /api/platform/orgs — lista todas as corretoras (somente OWNER)
export async function GET() {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ orgs });
}

function makeSlug(base: string): string {
  const s = (base || 'corretora')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'corretora';
  return `${s}-${Math.random().toString(36).slice(2, 7)}`;
}

// POST /api/platform/orgs — cria corretora + 1º admin + catálogo inicial (somente OWNER)
export async function POST(req: NextRequest) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const plan = String(body.plan || 'PROFISSIONAL').toUpperCase();
  const status = String(body.status || 'TRIAL').toUpperCase();
  const adminName = String(body.adminName || '').trim();
  const adminEmail = String(body.adminEmail || '').trim().toLowerCase();
  const adminPassword = String(body.adminPassword || '');

  if (!name) return NextResponse.json({ error: 'Informe o nome da corretora.' }, { status: 400 });
  if (!adminName) return NextResponse.json({ error: 'Informe o nome do administrador.' }, { status: 400 });
  if (!adminEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
    return NextResponse.json({ error: 'E-mail do administrador inválido.' }, { status: 400 });
  }
  if (adminPassword.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres.' }, { status: 400 });
  }
  if (!isPlanCode(plan)) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
  if (!isOrgStatus(status)) return NextResponse.json({ error: 'Situação inválida.' }, { status: 400 });

  const emailTaken = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (emailTaken) {
    return NextResponse.json({ error: 'Já existe uma conta com este e-mail.' }, { status: 409 });
  }

  const seatLimit = seatLimitForPlan(plan);
  const trialEndsAt = status === 'TRIAL' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;

  const org = await prisma.organization.create({
    data: { name, slug: makeSlug(name), plan, status, seatLimit, trialEndsAt },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      name: adminName,
      email: adminEmail,
      password: passwordHash,
      role: 'ADMIN',
      active: true,
    },
  });

  // Onboarding em 1 clique: semeia produtos + seguradoras da nova corretora.
  const catalog = await seedOrgCatalog(org.id);

  await audit({
    action: 'PLATFORM_CREATE_ORG',
    userId: guard.session.id,
    email: adminEmail,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { orgId: org.id, plan, status, catalog },
  });

  return NextResponse.json({ org, admin: { id: admin.id, email: admin.email }, catalog }, { status: 201 });
}
