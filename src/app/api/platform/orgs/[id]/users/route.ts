import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// POST /api/platform/orgs/[id]/users — cria um usuário na corretora (somente OWNER)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: { _count: { select: { users: true } } },
  });
  if (!org) return NextResponse.json({ error: 'Corretora não encontrada.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = String(body.role || 'CORRETOR').toUpperCase();

  if (!name) return NextResponse.json({ error: 'Informe o nome do usuário.' }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres.' }, { status: 400 });
  }
  if (role !== 'ADMIN' && role !== 'CORRETOR') {
    return NextResponse.json({ error: 'Papel inválido.' }, { status: 400 });
  }
  if (org._count.users >= org.seatLimit) {
    return NextResponse.json(
      { error: `Limite de ${org.seatLimit} usuários atingido para o plano desta corretora.` },
      { status: 409 },
    );
  }

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) return NextResponse.json({ error: 'Já existe uma conta com este e-mail.' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { orgId: params.id, name, email, password: passwordHash, role, active: true },
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });

  await audit({
    action: 'PLATFORM_CREATE_USER',
    userId: guard.session.id,
    email,
    orgId: params.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { orgId: params.id, role },
  });

  return NextResponse.json({ user }, { status: 201 });
}
