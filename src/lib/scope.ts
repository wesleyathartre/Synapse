import { getSession } from '@/lib/auth';

// Filtro de escopo: ADMIN vê tudo, corretor vê apenas o que é seu.
export async function ownerScope() {
  const user = await getSession();
  if (!user) return { user: null, where: {} as Record<string, never> };
  const where = user.role === 'ADMIN' ? {} : { ownerId: user.id };
  return { user, where };
}
