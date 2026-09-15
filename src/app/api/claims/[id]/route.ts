import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { CLAIM_STATUS, CLAIM_TYPES } from '@/lib/constants';

// PATCH /api/claims/[id] — atualiza um sinistro
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const existing = await prisma.claim.findFirst({ where: { id: params.id, ...where } });
  if (!existing) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.number === 'string') data.number = body.number.trim() || null;
  if (body.type && CLAIM_TYPES[body.type]) data.type = body.type;
  if (body.status && CLAIM_STATUS[body.status]) data.status = body.status;
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null;
  if (typeof body.insurer === 'string') data.insurer = body.insurer.trim() || null;
  if (body.incidentDate) data.incidentDate = new Date(body.incidentDate);
  if (body.reportedDate) data.reportedDate = new Date(body.reportedDate);
  if (body.amount !== undefined) data.amount = Number(body.amount) || 0;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }

  const claim = await prisma.claim.update({ where: { id: existing.id }, data });
  return NextResponse.json(claim);
}

// DELETE /api/claims/[id] — remove um sinistro
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const existing = await prisma.claim.findFirst({ where: { id: params.id, ...where }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 });

  await prisma.claim.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
