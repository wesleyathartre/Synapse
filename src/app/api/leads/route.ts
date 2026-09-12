import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || '';

  const w: any = { ...where };
  if (status) w.status = status;
  if (search) {
    w.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const data = await prisma.lead.findMany({
    where: w,
    orderBy: { createdAt: 'desc' },
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

  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone,
      source: body.source || 'SITE',
      interest: body.interest || 'AUTO',
      status: body.status || 'NOVO',
      temp: body.temp || 'MORNO',
      notes: body.notes || null,
      ownerId: user.id,
    },
  });
  return NextResponse.json(lead, { status: 201 });
}
