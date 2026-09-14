import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      deals: { orderBy: { createdAt: 'desc' } },
      policies: { orderBy: { endDate: 'asc' } },
      boletos: { orderBy: { dueDate: 'asc' } },
    },
  });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

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
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
