import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: { activities: { orderBy: { dueDate: 'asc' } } },
  });
  if (!deal) return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
  return NextResponse.json(deal);
}

// Atualização geral OU mudança de etapa/ordem no kanban (drag & drop)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.stage !== undefined) {
    data.stage = body.stage;
    // Mover para GANHO fecha a oportunidade
    if (body.stage === 'GANHO') {
      data.status = 'WON';
      data.probability = 100;
    }
  }
  if (body.order !== undefined) data.order = Number(body.order);
  if (body.status !== undefined) data.status = body.status;
  if (body.lostReason !== undefined) data.lostReason = body.lostReason;

  const deal = await prisma.deal.update({ where: { id: params.id }, data });
  return NextResponse.json(deal);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: {
      title: body.title,
      product: body.product,
      stage: body.stage,
      value: Number(body.value) || 0,
      premium: Number(body.premium) || 0,
      commission: Number(body.commission) || 0,
      probability: Number(body.probability) || 0,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      clientName: body.clientName,
      clientPhone: body.clientPhone ?? null,
    },
  });
  return NextResponse.json(deal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  await prisma.deal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
