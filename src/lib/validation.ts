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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Extrai a primeira mensagem de erro amigável de um ZodError
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message || 'Dados inválidos';
}
