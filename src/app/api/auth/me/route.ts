import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, signToken, setSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Busca papel/permissões frescos do banco — o admin pode ter alterado.
  const fresh = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, permissions: true, active: true },
  });

  if (!fresh || !fresh.active) {
    clearSessionCookie();
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = {
    id: fresh.id,
    name: fresh.name,
    email: fresh.email,
    role: fresh.role,
    permissions: fresh.permissions ?? [],
  };

  // Se algo mudou, re-emite o cookie para o middleware ficar em dia (sem exigir novo login).
  const changed =
    fresh.role !== session.role ||
    JSON.stringify(user.permissions) !== JSON.stringify(session.permissions ?? []);
  if (changed) {
    setSessionCookie(await signToken(user));
  }

  return NextResponse.json({ user });
}
