import { getSession, type SessionUser } from '@/lib/auth';
import { getOrgAccess, BLOCK_MESSAGE } from '@/lib/org-access';

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
  // Corretora suspensa/trial vencido: admin perde acesso até regularizar.
  const access = await getOrgAccess(session.orgId);
  if (!access.ok) return { ok: false, error: BLOCK_MESSAGE[access.reason!], status: 403 };
  return { ok: true, session };
}

/**
 * Garante que a requisição vem do OWNER da plataforma (super admin).
 * Só o OWNER pode gerenciar corretoras (criar, ativar, suspender).
 */
export async function requireOwner(): Promise<AdminGuard> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado', status: 401 };
  if (session.role !== 'OWNER') return { ok: false, error: 'Acesso restrito à plataforma', status: 403 };
  return { ok: true, session };
}
