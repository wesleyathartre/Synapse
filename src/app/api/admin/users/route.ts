import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { adminCreateUserSchema, firstError } from '@/lib/validation';
import { sanitizePermissions } from '@/lib/permissions';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// GET /api/admin/users — lista usuários (somente ADMIN)
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      permissions: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users });
}

// POST /api/admin/users — cria usuário (somente ADMIN)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = adminCreateUserSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { name, email, phone, role, password, permissions } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: 'Já existe uma conta com este e-mail' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      password: passwordHash,
      role,
      active: true,
      permissions: role === 'CORRETOR' ? sanitizePermissions(permissions) : [],
    },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, permissions: true, createdAt: true },
  });

  await audit({
    action: 'ADMIN_CREATE_USER',
    userId: guard.session.id,
    email,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return NextResponse.json({ user }, { status: 201 });
}
