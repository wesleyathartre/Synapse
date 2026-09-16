import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth-guard';

// GET /api/platform/orgs/[id]/audit — atividade recente da corretora (somente OWNER)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const users = await prisma.user.findMany({
    where: { orgId: params.id },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { orgId: params.id },
        { userId: { in: userIds } },
        { meta: { contains: params.id } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: { id: true, action: true, email: true, ip: true, createdAt: true },
  });

  return NextResponse.json({ logs });
}
