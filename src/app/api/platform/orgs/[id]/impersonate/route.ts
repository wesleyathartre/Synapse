import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';
import { AUTH_COOKIE, signToken, setSessionCookie, setImpersonatorCookie } from '@/lib/auth';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// POST /api/platform/orgs/[id]/impersonate — OWNER passa a acessar como a corretora
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const org = await prisma.organization.findUnique({ where: { id: params.id } });
  if (!org) return NextResponse.json({ error: 'Corretora não encontrada.' }, { status: 404 });

  // Prefere um ADMIN ativo; se não houver, usa o primeiro usuário ativo da corretora.
  const target =
    (await prisma.user.findFirst({
      where: { orgId: params.id, active: true, role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    })) ??
    (await prisma.user.findFirst({
      where: { orgId: params.id, active: true },
      orderBy: { createdAt: 'asc' },
    }));

  if (!target) {
    return NextResponse.json(
      { error: 'Esta corretora não tem usuário ativo para acessar.' },
      { status: 400 },
    );
  }

  // Guarda o token do OWNER para poder voltar depois.
  const ownerToken = cookies().get(AUTH_COOKIE)?.value;
  if (ownerToken) setImpersonatorCookie(ownerToken);

  const session = {
    id: target.id,
    orgId: target.orgId,
    name: target.name,
    email: target.email,
    role: target.role,
    permissions: target.permissions ?? [],
  };
  setSessionCookie(await signToken(session));

  await audit({
    action: 'PLATFORM_IMPERSONATE_START',
    userId: guard.session.id,
    email: guard.session.email,
    orgId: params.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { targetUserId: target.id, targetEmail: target.email },
  });

  return NextResponse.json({ user: session });
}
