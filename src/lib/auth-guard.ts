import { getSession, type SessionUser } from '@/lib/auth';

export type AdminGuard =
  | { ok: true; session: SessionUser }
  | { ok: false; error: string; status: number };

/**
 * Garante que a requisição vem de um usuário autenticado com role ADMIN.
 * Retorna { ok: true, session } quando autorizado, ou { ok: false, error, status }.
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado', status: 401 };
  if (session.role !== 'ADMIN') return { ok: false, error: 'Acesso restrito a administradores', status: 403 };
  return { ok: true, session };
}
