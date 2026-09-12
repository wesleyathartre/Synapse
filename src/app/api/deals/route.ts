import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status') || 'OPEN';
  const w: any = { ...where };
  if (status !== 'ALL') w.status = status;

  const data = await prisma.deal.findMany({
    where: w,
    orderBy: [{ stage: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.clientName) {
    return NextResponse.json({ error: 'Informe o cliente' }, { status: 400 });
  }

  const product = body.product || 'AUTO';
  const deal = await prisma.deal.create({
    data: {
      title: body.title || `${product} — ${body.clientName}`,
      product,
      stage: body.stage || 'NOVO',
      value: Number(body.value) || 0,
      premium: Number(body.premium) || 0,
      commission: Number(body.commission) || 0,
      probability: Number(body.probability) || 50,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      clientId: body.clientId || null,
      clientName: body.clientName,
      clientPhone: body.clientPhone || null,
      ownerId: user.id,
    },
  });
  return NextResponse.json(deal, { status: 201 });
}
