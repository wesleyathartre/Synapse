import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// PATCH /api/platform/orgs/[id]/users/[userId] — ativa/desativa, muda papel ou reseta senha (somente OWNER)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const target = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!target || target.orgId !== params.id) {
    return NextResponse.json({ error: 'Usuário não encontrado nesta corretora.' }, { status: 404 });
  }
  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Não é possível alterar um usuário OWNER.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.active !== undefined) data.active = Boolean(body.active);

  if (body.role !== undefined) {
    const role = String(body.role).toUpperCase();
    if (role !== 'ADMIN' && role !== 'CORRETOR') {
      return NextResponse.json({ error: 'Papel inválido.' }, { status: 400 });
    }
    data.role = role;
  }

  if (body.newPassword !== undefined) {
    const pw = String(body.newPassword);
    if (pw.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter ao menos 6 caracteres.' }, { status: 400 });
    }
    data.password = await bcrypt.hash(pw, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });

  await audit({
    action: 'PLATFORM_UPDATE_USER',
    userId: guard.session.id,
    email: target.email,
    orgId: params.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { orgId: params.id, changes: Object.keys(data) },
  });

  return NextResponse.json({ user: updated });
}
