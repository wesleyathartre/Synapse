import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';
import { canAccessKey, firstAllowedHref, isAdminOnlyPath, moduleKeyForPath } from '@/lib/permissions';

const AUTH_COOKIE = 'crm_token';
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'porto-crm-dev-secret',
);

// Rotas que não exigem login
const PUBLIC_PATHS = ['/login', '/privacidade'];

async function getPayload(token?: string): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = await getPayload(token);
  const authed = payload !== null;

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

  // Controle de acesso por tela (páginas). Admin acessa tudo.
  if (authed && !isPublic) {
    const role = (payload?.role as string) || 'CORRETOR';
    const perms = (payload?.permissions as string[] | undefined) ?? [];

    // Telas exclusivas de administrador
    if (isAdminOnlyPath(pathname) && role !== 'ADMIN') {
      return NextResponse.redirect(new URL(firstAllowedHref(role, perms), req.url));
    }

    // Telas controladas por permissão
    const moduleKey = moduleKeyForPath(pathname);
    if (moduleKey && !canAccessKey(role, perms, moduleKey)) {
      return NextResponse.redirect(new URL(firstAllowedHref(role, perms), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a tudo, exceto assets estáticos e arquivos do PWA
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.(?:png|jpg|jpeg|svg|ico)).*)',
  ],
};
