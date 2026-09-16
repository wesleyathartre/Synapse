import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const client = await prisma.client.findFirst({
    where: { id: params.id, ...where },
    include: {
      deals: { orderBy: { createdAt: 'desc' } },
      policies: {
        orderBy: { endDate: 'asc' },
        include: { _count: { select: { attachments: true } } },
      },
      boletos: { orderBy: { dueDate: 'asc' } },
      claims: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  // Activity não tem @relation com Client no schema (só tem clientId como campo).
  // Busca separada para manter o histórico de atividades na ficha 360°.
  const activities = await prisma.activity.findMany({
    where: { clientId: params.id, ...where },
    orderBy: { dueDate: 'desc' },
    take: 20,
  });

  return NextResponse.json({ ...client, activities });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.client.findFirst({ where: { id: params.id, ...where }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone,
      cpfCnpj: body.cpfCnpj ?? null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ? String(body.state).toUpperCase().slice(0, 2) : null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const existing = await prisma.client.findFirst({ where: { id: params.id, ...where }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
