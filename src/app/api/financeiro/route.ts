import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET() {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Carteira ativa (apólices vigentes) — base para prêmios e comissões
  const activeStatus = { in: ['ATIVA', 'A_VENCER', 'RENOVADA'] };

  const [carteira, mesAtual, policies, boletosByStatus] = await Promise.all([
    // Totais da carteira ativa
    prisma.policy.aggregate({
      where: { ...where, status: activeStatus },
      _count: true,
      _sum: { premium: true, commission: true },
    }),
    // Comissão de apólices emitidas no mês (somente contratos vigentes)
    prisma.policy.aggregate({
      where: { ...where, status: activeStatus, createdAt: { gte: startOfMonth } },
      _sum: { premium: true, commission: true },
    }),
    // Apólices para agregar por seguradora e por mês
    prisma.policy.findMany({
      where: { ...where, status: activeStatus },
      select: { insurer: true, premium: true, commission: true, createdAt: true },
    }),
    // Boletos por situação (recebido / a receber / vencido)
    prisma.boleto.groupBy({
      by: ['status'],
      where: { ...where },
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  // Agrupa por seguradora
  const insurerMap = new Map<string, { insurer: string; premium: number; commission: number; count: number }>();
  for (const p of policies) {
    const key = p.insurer || 'Sem seguradora';
    const cur = insurerMap.get(key) || { insurer: key, premium: 0, commission: 0, count: 0 };
    cur.premium += p.premium || 0;
    cur.commission += p.commission || 0;
    cur.count += 1;
    insurerMap.set(key, cur);
  }
  const byInsurer = Array.from(insurerMap.values())
    .map((x) => ({ ...x, premium: Math.round(x.premium), commission: Math.round(x.commission) }))
    .sort((a, b) => b.commission - a.commission);

  // Agrupa por mês (últimos 6 meses)
  const months: { key: string; mes: string; comissao: number; premio: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const mes = d.toLocaleDateString('pt-BR', { month: 'short' });
    months.push({ key, mes, comissao: 0, premio: 0 });
  }
  for (const p of policies) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) {
      m.comissao += p.commission || 0;
      m.premio += p.premium || 0;
    }
  }

  // Boletos
  const bStat = (s: string) => boletosByStatus.find((b) => b.status === s);
  const recebido = bStat('PAGO');
  const pendente = bStat('PENDENTE');
  const vencido = bStat('VENCIDO');

  return NextResponse.json({
    totals: {
      premium: Math.round(carteira._sum.premium || 0),
      commission: Math.round(carteira._sum.commission || 0),
      policies: carteira._count || 0,
      commissionMonth: Math.round(mesAtual._sum.commission || 0),
      premiumMonth: Math.round(mesAtual._sum.premium || 0),
    },
    boletos: {
      recebido: Math.round(recebido?._sum.amount || 0),
      recebidoCount: recebido?._count || 0,
      aReceber: Math.round(pendente?._sum.amount || 0),
      aReceberCount: pendente?._count || 0,
      vencido: Math.round(vencido?._sum.amount || 0),
      vencidoCount: vencido?._count || 0,
    },
    byInsurer,
    byMonth: months.map((m) => ({ mes: m.mes, comissao: Math.round(m.comissao), premio: Math.round(m.premio) })),
  });
}
