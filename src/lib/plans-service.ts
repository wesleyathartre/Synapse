import { prisma } from '@/lib/prisma';
import { PLANS, PLAN_CODES, isPlanCode, type PlanCode, type PlanDef } from '@/lib/plans';

// Lê os planos do banco e sobrescreve os padrões do código (código = fonte da verdade
// dos CODES; banco = fonte da verdade de label/preço/limite). Se a tabela não existir
// ou der erro, cai nos padrões — nada quebra.
export async function getPlans(): Promise<Record<PlanCode, PlanDef>> {
  const merged: Record<PlanCode, PlanDef> = {
    ESSENCIAL: { ...PLANS.ESSENCIAL },
    PROFISSIONAL: { ...PLANS.PROFISSIONAL },
    EMPRESARIAL: { ...PLANS.EMPRESARIAL },
  };
  try {
    const rows = await prisma.plan.findMany();
    for (const row of rows) {
      if (isPlanCode(row.code)) {
        merged[row.code] = {
          code: row.code,
          label: row.label,
          seatLimit: row.seatLimit,
          priceMonthly: row.priceMonthly,
        };
      }
    }
  } catch {
    /* fallback nos padrões */
  }
  return merged;
}

// Lista ordenada (na ordem canônica dos planos) para exibição.
export async function listPlans(): Promise<PlanDef[]> {
  const plans = await getPlans();
  return PLAN_CODES.map((code) => plans[code]);
}

// Limite de assentos do plano, considerando edição do OWNER.
export async function getSeatLimit(code: string): Promise<number> {
  if (!isPlanCode(code)) return 5;
  const plans = await getPlans();
  return plans[code].seatLimit;
}
