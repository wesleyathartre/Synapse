import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { adminUpdateUserSchema, firstError } from '@/lib/validation';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// PATCH /api/admin/users/[id] — ativa/desativa, troca papel ou reseta senha (somente ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = adminUpdateUserSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { active, role, password } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  // Impede o admin de se desativar ou rebaixar (evita lockout).
  if (target.id === guard.session.id && (active === false || role === 'CORRETOR')) {
    return NextResponse.json({ error: 'Você não pode desativar ou rebaixar a própria conta.' }, { status: 400 });
  }

  // Impede deixar o sistema sem nenhum admin ativo.
  if (target.role === 'ADMIN' && (active === false || role === 'CORRETOR')) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: 'ADMIN', active: true, id: { not: target.id } },
    });
    if (otherActiveAdmins === 0) {
      return NextResponse.json({ error: 'É necessário manter ao menos um administrador ativo.' }, { status: 400 });
    }
  }

  const data: { active?: boolean; role?: string; password?: string } = {};
  if (typeof active === 'boolean') data.active = active;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 12);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
  });

  await audit({
    action: 'ADMIN_UPDATE_USER',
    userId: guard.session.id,
    email: target.email,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return NextResponse.json({ user });
}
