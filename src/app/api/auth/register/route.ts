import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setSessionCookie } from '@/lib/auth';
import { registerSchema, firstError } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';
import { TERMS_VERSION } from '@/lib/legal';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  // Anti-abuso: no máx. 5 cadastros por IP a cada hora
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente mais tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const parsed = registerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { name, email, phone, password, marketingConsent } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: 'Já existe uma conta com este e-mail' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      password: passwordHash,
      role: 'CORRETOR',
      acceptedTermsAt: now,
      termsVersion: TERMS_VERSION,
      marketingConsent: !!marketingConsent,
      // Trilha de consentimento LGPD (prova com data, versão, IP e user agent)
      consentLogs: {
        create: [
          { type: 'TERMS', granted: true, version: TERMS_VERSION, ip, userAgent },
          { type: 'PRIVACY', granted: true, version: TERMS_VERSION, ip, userAgent },
          { type: 'MARKETING', granted: !!marketingConsent, version: TERMS_VERSION, ip, userAgent },
        ],
      },
    },
  });

  await audit({ action: 'REGISTER', userId: user.id, email, ip, userAgent });

  const session = { id: user.id, name: user.name, email: user.email, role: user.role, permissions: [] };
  const token = await signToken(session);
  setSessionCookie(token);

  return NextResponse.json({ user: session }, { status: 201 });
}
