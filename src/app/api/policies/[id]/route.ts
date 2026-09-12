import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const policy = await prisma.policy.update({
    where: { id: params.id },
    data: {
      number: body.number,
      product: body.product,
      insurer: body.insurer,
      premium: Number(body.premium) || 0,
      commission: Number(body.commission) || 0,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(policy);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  await prisma.policy.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
