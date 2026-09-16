import { z } from 'zod';

// Política de senha: mínimo 8, com letra e número
const password = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra')
  .regex(/[0-9]/, 'A senha deve conter ao menos um número');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  password,
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: 'É necessário aceitar os Termos e a Política de Privacidade',
  }),
  marketingConsent: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: password,
});

// Criação de usuário pelo painel do administrador
export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'CORRETOR']).default('CORRETOR'),
  password,
  permissions: z.array(z.string()).optional(),
});

// Atualização de usuário pelo administrador (ativar/desativar, trocar papel, resetar senha, permissões)
export const adminUpdateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['ADMIN', 'CORRETOR']).optional(),
  password: password.optional(),
  permissions: z.array(z.string()).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Extrai a primeira mensagem de erro amigável de um ZodError
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message || 'Dados inválidos';
}

// ── Sanitizadores numéricos (integridade financeira) ─────────────────────────
// Impedem que valores negativos, NaN ou Infinity entrem no banco por formulários.

// Valor monetário: número finito >= 0, com teto sanitário. Inválido → fallback.
export function toMoney(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, 1_000_000_000);
}

// Percentual entre 0 e 100. Inválido → fallback.
export function toPercent(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 0), 100);
}

// Contagem inteira >= 1 (ex.: parcelas). Inválido → fallback.
export function toCount(value: unknown, fallback = 1): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 1000);
}
