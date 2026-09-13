'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  CalendarClock,
  CheckSquare,
  Target,
  Award,
  Receipt,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, StatCard, Badge } from '@/components/ui';
import { money, moneyShort, formatDate, daysUntil, cx } from '@/lib/format';
import { STAGE_MAP, POLICY_STATUS } from '@/lib/constants';
import { useProducts } from '@/contexts/ProductsContext';

interface DashboardData {
  kpis: {
    pipelineValue: number;
    openDeals: number;
    commissionMonth: number;
    wonMonth: number;
    leads: number;
    activePolicies: number;
    tasksToday: number;
    renewalsCount: number;
  };
  renewals: any[];
  pipelineByStage: { stage: string; _count: number; _sum: { premium: number } }[];
  dealsByProduct: { product: string; _count: number; _sum: { premium: number } }[];
  wonByMonth: { mes: string; comissao: number; premio: number }[];
}

interface Boleto {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
}

export default function DashboardPage() {
  const { map: PRODUCTS } = useProducts();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!r.ok) throw new Error('Falha ao carregar o dashboard');
        return r.json();
      })
      .then((d) => {
        if (d && d.kpis) setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    // Boletos da semana
    fetch('/api/boletos?range=week')
      .then((r) => r.json())
      .then((d) => setBoletos(Array.isArray(d.data) ? d.data.slice(0, 6) : []))
      .catch(() => {});
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { kpis } = data;

  const productChart = data.dealsByProduct.map((d) => ({
    name: PRODUCTS[d.product]?.label || d.product,
    value: d._count,
    color: PRODUCTS[d.product]?.color || '#94a3b8',
  }));

  const stageChart = data.pipelineByStage
    .map((s) => ({
      name: STAGE_MAP[s.stage]?.label || s.stage,
      premio: Math.round(s._sum.premium || 0),
      color: STAGE_MAP[s.stage]?.color || '#94a3b8',
    }));

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral da sua carteira e do funil de vendas.</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Pipeline aberto"
          value={moneyShort(kpis.pipelineValue)}
          hint={`${kpis.openDeals} oportunidades`}
          icon={<Target size={20} />}
          accent="brand"
        />
        <StatCard
          label="Comissão no mês"
          value={moneyShort(kpis.commissionMonth)}
          hint={`${kpis.wonMonth} negócios ganhos`}
          icon={<DollarSign size={20} />}
          accent="emerald"
        />
        <StatCard
          label="Leads ativos"
          value={kpis.leads}
          hint="Aguardando contato"
          icon={<Users size={20} />}
          accent="violet"
        />
        <StatCard
          label="Apólices ativas"
          value={kpis.activePolicies}
          hint={`${kpis.renewalsCount} renovações a vencer`}
          icon={<FileText size={20} />}
          accent="sky"
        />
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Tarefas para hoje"
          value={kpis.tasksToday}
          hint="Pendentes"
          icon={<CheckSquare size={20} />}
          accent="amber"
        />
        <StatCard
          label="Renovações (30 dias)"
          value={kpis.renewalsCount}
          hint="Oportunidade de recompra"
          icon={<CalendarClock size={20} />}
          accent="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Comissão por mês */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-800">Comissão ganha (últimos 6 meses)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.wonByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="comissao" name="Comissão" fill="#2451eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribuição por produto */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-800">Oportunidades por produto</h2>
          </div>
          {productChart.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Sem dados</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={productChart} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {productChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline por etapa */}
        <Card className="p-5">
          <h2 className="font-bold text-slate-800 mb-4">Valor do funil por etapa</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChart} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="premio" name="Prêmio" radius={[0, 6, 6, 0]}>
                  {stageChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Renovações próximas */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-red-500" />
            <h2 className="font-bold text-slate-800">Renovações próximas</h2>
          </div>
          {data.renewals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma renovação nos próximos 30 dias 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.renewals.map((p) => {
                const d = daysUntil(p.endDate);
                const st = POLICY_STATUS[p.status] || POLICY_STATUS.ATIVA;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{p.clientName}</p>
                      <p className="text-xs text-slate-400">
                        {PRODUCTS[p.product]?.emoji} {p.number} · vence {formatDate(p.endDate)}
                      </p>
                    </div>
                    <Badge color={d <= 7 ? 'red' : 'amber'}>{d <= 0 ? 'vencida' : `${d}d`}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Widget — Boletos da Semana */}
      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-800">Boletos a vencer esta semana</h2>
            {boletos.filter((b) => b.status !== 'PAGO' && b.status !== 'CANCELADO').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                {boletos.filter((b) => b.status !== 'PAGO' && b.status !== 'CANCELADO').length}
              </span>
            )}
          </div>
          <Link
            href="/boletos"
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
          >
            Ver todos <ChevronRight size={14} />
          </Link>
        </div>

        {boletos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum boleto a vencer esta semana. 🎉</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {boletos.map((b) => {
              const d = daysUntil(b.dueDate);
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cx(
                      'w-2 h-2 rounded-full shrink-0',
                      d < 0   ? 'bg-red-500' :
                      d === 0 ? 'bg-red-400' :
                      d <= 3  ? 'bg-amber-400' :
                      'bg-emerald-400',
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{b.clientName}</p>
                      <p className="text-xs text-slate-400 truncate">{b.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-slate-800">{money(b.amount)}</p>
                    <p className={cx(
                      'text-xs font-semibold',
                      d < 0   ? 'text-red-500' :
                      d === 0 ? 'text-red-500' :
                      d <= 3  ? 'text-amber-500' :
                      'text-slate-400',
                    )}>
                      {d < 0 ? `${Math.abs(d)}d atraso` : d === 0 ? 'Hoje' : `${d}d`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
