import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { toMoney } from '@/lib/validation';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Datas de início e fim de uma semana a partir de hoje */
function weekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Retorna datas de parcelas baseado na periodicidade */
function buildInstallmentDates(
  startDate: Date,
  paymentType: string,
  installments: number,
): Date[] {
  const dates: Date[] = [];
  const intervalMonths: Record<string, number> = {
    MENSAL: 1,
    TRIMESTRAL: 3,
    SEMESTRAL: 6,
    ANUAL: 12,
    UNICO: 0,
  };
  const interval = intervalMonths[paymentType] ?? 1;
  if (interval === 0 || installments <= 1) {
    dates.push(new Date(startDate));
    return dates;
  }
  for (let i = 0; i < installments; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i * interval);
    dates.push(d);
  }
  return dates;
}

// ── GET /api/boletos ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const range  = params.get('range');   // 'week' | 'today' | 'overdue' | 'all'
  const status = params.get('status');  // PENDENTE | PAGO | VENCIDO | CANCELADO
  const search = params.get('search') || '';

  const w: any = { ...where };

  if (status) {
    w.status = status;
  }

  if (range === 'week') {
    const { start, end } = weekRange();
    w.dueDate = { gte: start, lte: end };
    if (!status) w.status = { in: ['PENDENTE', 'VENCIDO'] };
  } else if (range === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    w.dueDate = { gte: start, lte: end };
    if (!status) w.status = { in: ['PENDENTE', 'VENCIDO'] };
  } else if (range === 'overdue') {
    w.dueDate = { lt: new Date() };
    if (!status) w.status = 'PENDENTE';
  }

  if (search) {
    w.OR = [
      { clientName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const data = await prisma.boleto.findMany({
    where: w,
    orderBy: { dueDate: 'asc' },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      policy: { select: { id: true, number: true, product: true } },
    },
  });

  // resumo para o dashboard
  const now = new Date();
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const in3daysEnd = new Date(now); in3daysEnd.setDate(in3daysEnd.getDate() + 3); in3daysEnd.setHours(23, 59, 59, 999);
  const weekEnd    = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7); weekEnd.setHours(23, 59, 59, 999);

  const summary = await prisma.boleto.groupBy({
    by: ['status'],
    where: { ...where, status: { in: ['PENDENTE', 'VENCIDO'] } },
    _count: true,
    _sum: { amount: true },
  });

  return NextResponse.json({ data, summary });
}

// ── POST /api/boletos ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Validações básicas
  if (!body.clientId || !body.description || !body.amount || !body.dueDate) {
    return NextResponse.json(
      { error: 'Cliente, descrição, valor e data de vencimento são obrigatórios' },
      { status: 400 },
    );
  }

  const amount = toMoney(body.amount);
  if (amount <= 0) {
    return NextResponse.json({ error: 'Valor do boleto inválido.' }, { status: 400 });
  }

  const client = await prisma.client.findFirst({ where: { id: body.clientId, ...where } });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  // ── Modo AUTO: gera parcelas a partir de uma apólice ──
  if (body.fromPolicy && body.policyId) {
    const policy = await prisma.policy.findFirst({ where: { id: body.policyId, ...where } });
    if (!policy) return NextResponse.json({ error: 'Apólice não encontrada' }, { status: 404 });

    const dates = buildInstallmentDates(
      new Date(body.dueDate),
      policy.paymentType,
      policy.installments,
    );

    const created = await prisma.$transaction(
      dates.map((date, i) =>
        prisma.boleto.create({
          data: {
            clientId: client.id,
            clientName: client.name,
            policyId: policy.id,
            orgId: user.orgId,
            ownerId: user.id,
            description: `Parcela ${i + 1}/${dates.length} — ${body.description || policy.number}`,
            amount,
            dueDate: date,
            status: 'PENDENTE',
            barcode: body.barcode || null,
            notes: body.notes || null,
            origin: 'AUTO',
            installmentNumber: i + 1,
            installmentTotal: dates.length,
          },
        }),
      ),
    );

    return NextResponse.json({ created, count: created.length }, { status: 201 });
  }

  // ── Modo MANUAL: cria um boleto único ──
  const boleto = await prisma.boleto.create({
    data: {
      clientId: client.id,
      clientName: client.name,
      policyId: body.policyId || null,
      dealId: body.dealId || null,
      orgId: user.orgId,
      ownerId: user.id,
      description: body.description,
      amount,
      dueDate: new Date(body.dueDate),
      status: 'PENDENTE',
      barcode: body.barcode || null,
      notes: body.notes || null,
      origin: 'MANUAL',
    },
  });

  return NextResponse.json(boleto, { status: 201 });
}
