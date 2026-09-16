import { NextResponse } from 'next/server';
import {
  verifyToken,
  setSessionCookie,
  getImpersonatorToken,
  clearImpersonatorCookie,
} from '@/lib/auth';

// POST /api/platform/impersonate/stop — encerra a impersonação e restaura o OWNER
export async function POST() {
  const token = getImpersonatorToken();
  if (!token) {
    return NextResponse.json({ error: 'Nenhuma sessão de plataforma para restaurar.' }, { status: 400 });
  }

  const owner = await verifyToken(token);
  if (!owner || owner.role !== 'OWNER') {
    clearImpersonatorCookie();
    return NextResponse.json({ error: 'Sessão de plataforma inválida.' }, { status: 400 });
  }

  setSessionCookie(token);
  clearImpersonatorCookie();
  return NextResponse.json({ ok: true });
}
