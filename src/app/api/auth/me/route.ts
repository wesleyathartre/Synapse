import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, signToken, setSessionCookie, clearSessionCookie, getImpersonatorToken } from '@/lib/auth';
import { evalOrgAccess, BLOCK_MESSAGE } from '@/lib/org-access';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Busca papel/permissões frescos do banco — o admin pode ter alterado.
  const fresh = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, orgId: true, name: true, email: true, role: true, permissions: true, active: true },
  });

  if (!fresh || !fresh.active) {
    clearSessionCookie();
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = {
    id: fresh.id,
    orgId: fresh.orgId,
    name: fresh.name,
    email: fresh.email,
    role: fresh.role,
    permissions: fresh.permissions ?? [],
  };

  // Situação da corretora (bloqueio de trial vencido / suspensão). OWNER nunca é bloqueado.
  let org: { status: string; blocked: boolean; reason: string | null; message: string | null } = {
    status: 'ACTIVE', blocked: false, reason: null, message: null,
  };
  if (fresh.role !== 'OWNER') {
    const o = await prisma.organization.findUnique({
      where: { id: fresh.orgId },
      select: { status: true, trialEndsAt: true },
    });
    if (o) {
      const access = evalOrgAccess(o.status, o.trialEndsAt);
      org = {
        status: o.status,
        blocked: !access.ok,
        reason: access.reason ?? null,
        message: access.reason ? BLOCK_MESSAGE[access.reason] : null,
      };
    }
  }

  // Se algo mudou, re-emite o cookie para o middleware ficar em dia (sem exigir novo login).
  const changed =
    fresh.role !== session.role ||
    JSON.stringify(user.permissions) !== JSON.stringify(session.permissions ?? []);
  if (changed) {
    setSessionCookie(await signToken(user));
  }

  return NextResponse.json({ user, org, impersonating: !!getImpersonatorToken() });
}
