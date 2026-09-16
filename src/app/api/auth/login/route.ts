import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setSessionCookie } from '@/lib/auth';
import { loginSchema, firstError } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  // Anti força-bruta: 10 tentativas por IP a cada 15 min
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas de login. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
    await audit({ action: 'LOGIN_FAIL', email, ip, userAgent });
    // Mensagem genérica (não revela se o e-mail existe)
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ action: 'LOGIN_SUCCESS', userId: user.id, email, ip, userAgent });

  const session = {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions ?? [],
  };
  const token = await signToken(session);
  setSessionCookie(token);

  return NextResponse.json({ user: session });
}
