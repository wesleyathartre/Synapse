import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'crm_token';
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'porto-crm-dev-secret',
);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
      permissions: (payload.permissions as string[] | undefined) ?? [],
    };
  } catch {
    return null;
  }
}

// Lê a sessão a partir do cookie (Server Components / Route Handlers)
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export const AUTH_COOKIE = COOKIE_NAME;
