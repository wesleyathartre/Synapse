import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

function computeStatus(endDate: Date): string {
  const now = new Date();
  const days = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'VENCIDA';
  if (days <= 30) return 'A_VENCER';
  return 'ATIVA';
}

export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || '';
  const w: any = { ...where };
  if (status) w.status = status;
  if (search) {
    w.OR = [
      { number: { contains: search } },
      { clientName: { contains: search } },
    ];
  }

  const data = await prisma.policy.findMany({
    where: w,
    orderBy: { endDate: 'asc' },
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.number || !body.clientId || !body.endDate) {
    return NextResponse.json(
      { error: 'Número, cliente e data de renovação são obrigatórios' },
      { status: 400 },
    );
  }

  const endDate = new Date(body.endDate);
  const client = await prisma.client.findFirst({ where: { id: body.clientId, ...where } });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  const policy = await prisma.policy.create({
    data: {
      number: body.number,
      product: body.product || 'AUTO',
      insurer: body.insurer,
      clientId: body.clientId,
      clientName: client?.name || body.clientName || '',
      premium: Number(body.premium) || 0,
      commission: Number(body.commission) || 0,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate,
      status: computeStatus(endDate),
      orgId: user.orgId,
      ownerId: user.id,
      dealId: body.dealId || null,
      paymentType: body.paymentType || 'UNICO',
      installments: Math.max(1, Number(body.installments) || 1),
      notes: body.notes || null,
    },
  });
  return NextResponse.json(policy, { status: 201 });
}
