import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'crm_token';
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'porto-crm-dev-secret',
);

// Rotas que não exigem login
const PUBLIC_PATHS = ['/login', '/privacidade'];

async function isValid(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = await isValid(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // API de auth, APIs públicas, crons e Webhooks/chat externos (ex.: SDR) são sempre liberados
  // Crons são protegidos internamente via CRON_SECRET, não por JWT
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/sdr/webhook') ||
    pathname.startsWith('/api/sdr/web')
  ) {
    return NextResponse.next();
  }

  // Bloqueia APIs sem token
  if (pathname.startsWith('/api')) {
    if (!authed) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Já logado tentando acessar /login → manda pro dashboard
  if (isPublic && authed) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Rota protegida sem login → manda pro /login
  if (!isPublic && !authed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a tudo, exceto assets estáticos e arquivos do PWA
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.(?:png|jpg|jpeg|svg|ico)).*)',
  ],
};
