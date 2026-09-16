import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const search = req.nextUrl.searchParams.get('search') || '';
  const w: any = { ...where };
  if (search) {
    w.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { cpfCnpj: { contains: search } },
      { city: { contains: search } },
    ];
  }

  const data = await prisma.client.findMany({
    where: w,
    orderBy: { name: 'asc' },
    include: { _count: { select: { deals: true, policies: true } } },
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.phone) {
    return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone,
      cpfCnpj: body.cpfCnpj || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      address: body.address || null,
      city: body.city || null,
      state: body.state ? String(body.state).toUpperCase().slice(0, 2) : null,
      notes: body.notes || null,
      orgId: user.orgId,
      ownerId: user.id,
    },
  });
  return NextResponse.json(client, { status: 201 });
}
