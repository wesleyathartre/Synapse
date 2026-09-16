import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

// LGPD — Direito de portabilidade: exporta todos os dados do usuário em JSON.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // Anti-abuso: limita exportações completas por usuário (10 por hora).
  const rl = rateLimit(`account-export:${session.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitas exportações. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const [user, leads, clients, deals, policies, activities, consents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        acceptedTermsAt: true, termsVersion: true, marketingConsent: true,
        lastLoginAt: true, createdAt: true,
      },
    }),
    prisma.lead.findMany({ where: { ownerId: session.id } }),
    prisma.client.findMany({ where: { ownerId: session.id } }),
    prisma.deal.findMany({ where: { ownerId: session.id } }),
    prisma.policy.findMany({ where: { ownerId: session.id } }),
    prisma.activity.findMany({ where: { ownerId: session.id } }),
    prisma.consentLog.findMany({ where: { userId: session.id } }),
  ]);

  await audit({ action: 'DATA_EXPORT', userId: session.id, email: session.email });

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    consents,
    leads,
    clients,
    deals,
    policies,
    activities,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="meus-dados-${session.id}.json"`,
    },
  });
}
