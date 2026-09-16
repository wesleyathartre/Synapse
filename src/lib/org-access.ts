// Controle de acesso da corretora (Fase 3 — cobrança/bloqueio).
import { prisma } from '@/lib/prisma';

// Organização interna da Synapse (dona da plataforma); não é uma corretora cliente.
export const PLATFORM_ORG_SLUG = 'synapse-plataforma';

export type BlockReason = 'SUSPENDED' | 'TRIAL_EXPIRED';

export interface OrgAccess {
  ok: boolean;
  reason?: BlockReason;
  status: string;
  trialEndsAt: Date | null;
}

// Regra pura: decide se a corretora pode usar o sistema.
export function evalOrgAccess(status: string, trialEndsAt: Date | null): OrgAccess {
  if (status === 'SUSPENDED') return { ok: false, reason: 'SUSPENDED', status, trialEndsAt };
  if (status === 'TRIAL' && trialEndsAt && trialEndsAt.getTime() < Date.now()) {
    return { ok: false, reason: 'TRIAL_EXPIRED', status, trialEndsAt };
  }
  return { ok: true, status, trialEndsAt };
}

// Busca a situação da corretora no banco e avalia o acesso.
export async function getOrgAccess(orgId: string): Promise<OrgAccess> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { status: true, trialEndsAt: true },
  });
  if (!org) return { ok: false, reason: 'SUSPENDED', status: 'SUSPENDED', trialEndsAt: null };
  return evalOrgAccess(org.status, org.trialEndsAt);
}

export const BLOCK_MESSAGE: Record<BlockReason, string> = {
  SUSPENDED: 'Sua corretora está suspensa. Fale com o suporte para reativar o acesso.',
  TRIAL_EXPIRED: 'Seu período de teste terminou. Ative um plano para continuar usando o Synapse CRM.',
};
