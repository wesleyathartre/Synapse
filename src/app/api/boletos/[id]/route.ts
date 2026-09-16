import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { toMoney } from '@/lib/validation';

// ── PATCH /api/boletos/[id] ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const boleto = await prisma.boleto.findFirst({ where: { id: params.id, ...where } });
  if (!boleto) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const updated = await prisma.boleto.update({
    where: { id: params.id },
    data: {
      status:   body.status   ?? boleto.status,
      paidAt:   body.status === 'PAGO' ? (body.paidAt ? new Date(body.paidAt) : new Date()) : (body.status === 'PENDENTE' ? null : boleto.paidAt),
      barcode:  body.barcode  !== undefined ? body.barcode  : boleto.barcode,
      notes:    body.notes    !== undefined ? body.notes    : boleto.notes,
      amount:   body.amount   !== undefined ? toMoney(body.amount, boleto.amount) : boleto.amount,
      dueDate:  body.dueDate  !== undefined ? new Date(body.dueDate) : boleto.dueDate,
      description: body.description ?? boleto.description,
    },
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/boletos/[id] ──────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const boleto = await prisma.boleto.findFirst({ where: { id: params.id, ...where } });
  if (!boleto) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 });

  await prisma.boleto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// ── GET /api/boletos/[id] ─────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const boleto = await prisma.boleto.findFirst({
    where: { id: params.id, ...where },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      policy: { select: { id: true, number: true, product: true } },
    },
  });
  if (!boleto) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 });

  return NextResponse.json(boleto);
}
