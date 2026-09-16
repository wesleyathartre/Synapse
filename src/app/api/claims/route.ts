import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { CLAIM_STATUS, CLAIM_TYPES } from '@/lib/constants';
import { toMoney } from '@/lib/validation';

// GET /api/claims — lista sinistros (escopo do corretor) + resumo
export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status') || '';
  const search = req.nextUrl.searchParams.get('search') || '';
  const w: any = { ...where };
  if (status && CLAIM_STATUS[status]) w.status = status;
  if (search) {
    w.OR = [
      { clientName: { contains: search, mode: 'insensitive' } },
      { number: { contains: search, mode: 'insensitive' } },
      { policyNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const data = await prisma.claim.findMany({ where: w, orderBy: { createdAt: 'desc' } });

  const open = data.filter((c) => !['ENCERRADO', 'NEGADO'].includes(c.status)).length;
  const summary = {
    total: data.length,
    open,
    paid: data.filter((c) => c.status === 'PAGO').length,
    amount: data.reduce((a, c) => a + (c.amount || 0), 0),
  };
  return NextResponse.json({ data, summary });
}

// POST /api/claims — abre um sinistro
export async function POST(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.clientId) {
    return NextResponse.json({ error: 'Selecione o cliente.' }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: body.clientId, ...where },
  });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });

  let policy = null;
  if (body.policyId) {
    policy = await prisma.policy.findFirst({
      where: { id: body.policyId, ...where },
    });
  }

  const type = CLAIM_TYPES[body.type] ? body.type : 'OUTRO';
  const status = CLAIM_STATUS[body.status] ? body.status : 'ABERTO';

  const claim = await prisma.claim.create({
    data: {
      number: body.number?.trim() || null,
      clientId: client.id,
      clientName: client.name,
      policyId: policy?.id || null,
      policyNumber: policy?.number || null,
      insurer: policy?.insurer || body.insurer?.trim() || null,
      product: policy?.product || body.product || 'AUTO',
      type,
      status,
      description: body.description?.trim() || null,
      incidentDate: body.incidentDate ? new Date(body.incidentDate) : new Date(),
      reportedDate: body.reportedDate ? new Date(body.reportedDate) : new Date(),
      amount: toMoney(body.amount),
      notes: body.notes?.trim() || null,
      orgId: user.orgId,
      ownerId: user.id,
    },
  });
  return NextResponse.json(claim, { status: 201 });
}
