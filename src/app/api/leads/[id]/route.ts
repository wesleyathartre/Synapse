import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const lead = await prisma.lead.findFirst({ where: { id: params.id, ...where } });
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.lead.findFirst({ where: { id: params.id, ...where } });
  if (!existing) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone,
      source: body.source,
      interest: body.interest,
      status: body.status,
      temp: body.temp,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(lead);
}

// Converte lead em cliente + oportunidade no funil
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const lead = await prisma.lead.findFirst({ where: { id: params.id, ...where } });
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  const client = await prisma.client.create({
    data: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      orgId: lead.orgId,
      ownerId: user.id,
    },
  });

  const deal = await prisma.deal.create({
    data: {
      title: `${lead.interest} — ${lead.name}`,
      product: lead.interest,
      stage: 'NOVO',
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      orgId: lead.orgId,
      ownerId: user.id,
    },
  });

  await prisma.lead.update({
    where: { id: params.id },
    data: { status: 'CONVERTIDO' },
  });

  return NextResponse.json({ client, deal });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const existing = await prisma.lead.findFirst({ where: { id: params.id, ...where } });
  if (!existing) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  await prisma.lead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
