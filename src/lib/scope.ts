import { getSession } from '@/lib/auth';
import { getOrgAccess } from '@/lib/org-access';

// Filtro de escopo multi-tenant:
// - OWNER (plataforma): vê tudo, de todas as corretoras (sem filtro).
// - ADMIN da corretora: vê tudo DA CORRETORA dele (orgId).
// - CORRETOR: vê apenas o que é dele, DENTRO da corretora (orgId + ownerId).
// Corretora suspensa ou com trial vencido perde o acesso aos dados (user = null).
export async function ownerScope() {
  const user = await getSession();
  if (!user) return { user: null, where: {} as Record<string, never> };

  // OWNER nunca é bloqueado. Demais papéis dependem da situação da corretora.
  if (user.role !== 'OWNER') {
    const access = await getOrgAccess(user.orgId);
    if (!access.ok) return { user: null, where: {} as Record<string, never> };
  }

  let where: Record<string, unknown> = {};
  if (user.role === 'OWNER') {
    where = {}; // acesso total (todas as corretoras)
  } else if (user.role === 'ADMIN') {
    where = { orgId: user.orgId };
  } else {
    where = { orgId: user.orgId, ownerId: user.id };
  }
  return { user, where };
}

// Alias semântico (multi-tenant). Mesmo comportamento de ownerScope.
export const orgScope = ownerScope;
