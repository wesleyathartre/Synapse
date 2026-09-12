import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { changePasswordSchema, firstError } from '@/lib/validation';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const parsed = changePasswordSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } });

  await audit({
    action: 'PASSWORD_CHANGE',
    userId: user.id,
    email: user.email,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return NextResponse.json({ ok: true });
}
