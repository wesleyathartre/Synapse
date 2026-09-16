import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Extrai o IP do cliente respeitando proxies (x-forwarded-for)
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'desconhecido';
}

export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || '';
}

interface AuditInput {
  action: string;
  userId?: string | null;
  email?: string | null;
  orgId?: string | null;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

// Grava evento de auditoria (nunca deve quebrar o fluxo principal)
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        email: input.email ?? null,
        orgId: input.orgId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch {
    /* auditoria é best-effort */
  }
}
