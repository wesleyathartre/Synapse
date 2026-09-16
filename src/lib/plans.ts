// Planos comerciais do SaaS (cobrança por nº de usuários/corretores).
export type PlanCode = 'ESSENCIAL' | 'PROFISSIONAL' | 'EMPRESARIAL';

export interface PlanDef {
  code: PlanCode;
  label: string;
  seatLimit: number;
  priceMonthly: number; // em reais
}

export const PLANS: Record<PlanCode, PlanDef> = {
  ESSENCIAL:    { code: 'ESSENCIAL',    label: 'Essencial',    seatLimit: 1,  priceMonthly: 149 },
  PROFISSIONAL: { code: 'PROFISSIONAL', label: 'Profissional', seatLimit: 5,  priceMonthly: 397 },
  EMPRESARIAL:  { code: 'EMPRESARIAL',  label: 'Empresarial',  seatLimit: 15, priceMonthly: 897 },
};

export const PLAN_CODES = Object.keys(PLANS) as PlanCode[];

export function isPlanCode(v: unknown): v is PlanCode {
  return typeof v === 'string' && v in PLANS;
}

export function seatLimitForPlan(plan: string): number {
  return isPlanCode(plan) ? PLANS[plan].seatLimit : 5;
}

// Situação da corretora (Organization.status).
export type OrgStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
export const ORG_STATUSES: OrgStatus[] = ['TRIAL', 'ACTIVE', 'SUSPENDED'];
export function isOrgStatus(v: unknown): v is OrgStatus {
  return typeof v === 'string' && (ORG_STATUSES as string[]).includes(v);
}
