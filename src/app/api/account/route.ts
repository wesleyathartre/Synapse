import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// Perfil da conta + status de consentimento (LGPD)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      acceptedTermsAt: true, termsVersion: true, marketingConsent: true,
      lastLoginAt: true, createdAt: true,
    },
  });
  return NextResponse.json({ user });
}

// Atualiza dados do perfil e consentimento de marketing (opt-in/opt-out LGPD)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;

  if (typeof body.marketingConsent === 'boolean') {
    data.marketingConsent = body.marketingConsent;
    await prisma.consentLog.create({
      data: {
        userId: session.id,
        type: 'MARKETING',
        granted: body.marketingConsent,
        version: 'update',
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });
  }

  const user = await prisma.user.update({ where: { id: session.id }, data });
  return NextResponse.json({ ok: true, user: { name: user.name, phone: user.phone, marketingConsent: user.marketingConsent } });
}

// LGPD — Direito ao esquecimento: apaga a conta e todos os dados vinculados.
// Exige a senha para confirmar a identidade.
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { password } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 400 });
  }

  const uid = session.id;
  // Remove dependências antes do usuário
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { ownerId: uid } }),
    prisma.policy.deleteMany({ where: { ownerId: uid } }),
    prisma.deal.deleteMany({ where: { ownerId: uid } }),
    prisma.client.deleteMany({ where: { ownerId: uid } }),
    prisma.lead.deleteMany({ where: { ownerId: uid } }),
    prisma.consentLog.deleteMany({ where: { userId: uid } }),
    prisma.user.delete({ where: { id: uid } }),
  ]);

  await audit({
    action: 'ACCOUNT_DELETE',
    email: user.email,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
