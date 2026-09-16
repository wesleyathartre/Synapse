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

function buildInstallmentDates(startDate: Date, paymentType: string, installments: number): Date[] {
  const intervalMonths: Record<string, number> = { MENSAL: 1, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12, UNICO: 0 };
  const interval = intervalMonths[paymentType] ?? 1;
  if (interval === 0 || installments <= 1) return [new Date(startDate)];
  const dates: Date[] = [];
  for (let i = 0; i < installments; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i * interval);
    dates.push(d);
  }
  return dates;
}

// POST — fecha a venda (GANHO) e gera a apólice vinculada + boletos (opcional)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const deal = await prisma.deal.findFirst({ where: { id: params.id, ...where } });
  if (!deal) return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });

  // Já existe apólice para esta venda? Não duplica.
  const existing = await prisma.policy.findFirst({ where: { dealId: deal.id } });
  if (existing) {
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: 'GANHO', status: 'WON', probability: 100 } });
    return NextResponse.json({ policy: existing, boletos: 0, alreadyExisted: true });
  }

  const body = await req.json().catch(() => ({}));

  // Cliente: precisa estar vinculado (amarração). Usa o do deal ou o enviado no fechamento.
  const clientId = deal.clientId || body.clientId || null;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Vincule um cliente à oportunidade antes de fechar a venda.' },
      { status: 400 },
    );
  }
  const client = await prisma.client.findFirst({ where: { id: clientId, orgId: deal.orgId } });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  // Datas de vigência (padrão: hoje + 1 ano)
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate
    ? new Date(body.endDate)
    : new Date(new Date(startDate).setFullYear(startDate.getFullYear() + 1));

  // Número da apólice: automático (AP-ANO-0001), editável pelo usuário
  const year = startDate.getFullYear();
  let number = String(body.number || '').trim();
  if (!number) {
    const count = await prisma.policy.count({ where: { orgId: deal.orgId, number: { startsWith: `AP-${year}-` } } });
    number = `AP-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  // Garante unicidade
  let n = 1;
  const base = number;
  while (await prisma.policy.findFirst({ where: { orgId: deal.orgId, number } })) {
    number = `${base}-${n++}`;
  }

  const paymentType = String(body.paymentType || 'UNICO');
  const installments = Math.max(1, Number(body.installments) || 1);

  // Transação: cria apólice, marca venda como ganha, (opcional) gera boletos
  const result = await prisma.$transaction(async (tx) => {
    const policy = await tx.policy.create({
      data: {
        number,
        product: deal.product,
        insurer: String(body.insurer || '').trim(),
        clientId: client.id,
        clientName: client.name,
        premium: deal.premium || 0,
        commission: deal.commission || 0,
        startDate,
        endDate,
        status: computeStatus(endDate),
        dealId: deal.id,
        orgId: deal.orgId,
        ownerId: deal.ownerId,
        paymentType,
        installments,
        notes: `Gerada a partir da venda: ${deal.title}`,
      },
    });

    await tx.deal.update({
      where: { id: deal.id },
      data: { stage: 'GANHO', status: 'WON', probability: 100, clientId: client.id },
    });

    let boletosCount = 0;
    if (body.generateBoletos && (deal.premium || 0) > 0) {
      const firstDue = body.firstDueDate ? new Date(body.firstDueDate) : startDate;
      const dates = buildInstallmentDates(firstDue, paymentType, installments);
      const perParcel = Math.round(((deal.premium || 0) / dates.length) * 100) / 100;
      await tx.boleto.createMany({
        data: dates.map((date, i) => ({
          clientId: client.id,
          clientName: client.name,
          policyId: policy.id,
          dealId: deal.id,
          orgId: deal.orgId,
          ownerId: deal.ownerId,
          description: `Parcela ${i + 1}/${dates.length} — Apólice ${number}`,
          amount: perParcel,
          dueDate: date,
          status: 'PENDENTE',
          origin: 'AUTO',
          installmentNumber: i + 1,
          installmentTotal: dates.length,
        })),
      });
      boletosCount = dates.length;
    }

    return { policy, boletosCount };
  });

  return NextResponse.json({ policy: result.policy, boletos: result.boletosCount }, { status: 201 });
}
