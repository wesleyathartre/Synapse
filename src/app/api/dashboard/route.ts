import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET() {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [
    openDeals,
    wonThisMonth,
    leadsCount,
    activePolicies,
    renewals,
    tasksToday,
    pipelineByStage,
    dealsByProduct,
    wonByMonth,
  ] = await Promise.all([
    // Oportunidades abertas + soma do pipeline
    prisma.deal.aggregate({
      where: { ...where, status: 'OPEN' },
      _count: true,
      _sum: { value: true, premium: true, commission: true },
    }),
    // Ganhas no mês (comissão)
    prisma.deal.aggregate({
      where: { ...where, status: 'WON', updatedAt: { gte: startOfMonth } },
      _count: true,
      _sum: { commission: true, premium: true },
    }),
    // Leads em aberto
    prisma.lead.count({
      where: { ...where, status: { in: ['NOVO', 'EM_CONTATO', 'QUALIFICADO'] } },
    }),
    // Apólices ativas
    prisma.policy.count({ where: { ...where, status: { in: ['ATIVA', 'A_VENCER'] } } }),
    // Renovações nos próximos 30 dias
    prisma.policy.findMany({
      where: { ...where, endDate: { gte: now, lte: in30 }, status: { not: 'CANCELADA' } },
      orderBy: { endDate: 'asc' },
      take: 8,
    }),
    // Tarefas de hoje pendentes
    prisma.activity.count({
      where: { ...where, done: false, dueDate: { gte: startOfDay, lt: endOfDay } },
    }),
    // Pipeline por etapa
    prisma.deal.groupBy({
      by: ['stage'],
      where: { ...where, status: 'OPEN' },
      _count: true,
      _sum: { premium: true },
    }),
    // Distribuição por produto (abertas)
    prisma.deal.groupBy({
      by: ['product'],
      where: { ...where, status: 'OPEN' },
      _count: true,
      _sum: { premium: true },
    }),
    // Ganhas por mês (últimos meses) — feito em memória
    prisma.deal.findMany({
      where: { ...where, status: 'WON' },
      select: { updatedAt: true, commission: true, premium: true },
    }),
  ]);

  // Agrega ganhas por mês (últimos 6 meses)
  const months: { key: string; label: string; comissao: number; premio: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short' });
    months.push({ key, label, comissao: 0, premio: 0 });
  }
  for (const w of wonByMonth) {
    const d = new Date(w.updatedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) {
      m.comissao += w.commission || 0;
      m.premio += w.premium || 0;
    }
  }

  return NextResponse.json({
    kpis: {
      pipelineValue: openDeals._sum.premium || 0,
      openDeals: openDeals._count || 0,
      commissionMonth: wonThisMonth._sum.commission || 0,
      wonMonth: wonThisMonth._count || 0,
      leads: leadsCount,
      activePolicies,
      tasksToday,
      renewalsCount: renewals.length,
    },
    renewals,
    pipelineByStage,
    dealsByProduct,
    wonByMonth: months.map((m) => ({ mes: m.label, comissao: Math.round(m.comissao), premio: Math.round(m.premio) })),
  });
}
