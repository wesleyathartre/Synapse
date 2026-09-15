'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Wallet, DollarSign, FileText, TrendingUp, CheckCircle2, Clock, AlertTriangle, Building2, Loader2, Download } from 'lucide-react';
import { Card, StatCard, Empty, Button } from '@/components/ui';
import { money, moneyShort } from '@/lib/format';

interface FinanceData {
  totals: {
    premium: number;
    commission: number;
    policies: number;
    commissionMonth: number;
    premiumMonth: number;
  };
  boletos: {
    recebido: number;
    recebidoCount: number;
    aReceber: number;
    aReceberCount: number;
    vencido: number;
    vencidoCount: number;
  };
  byInsurer: { insurer: string; premium: number; commission: number; count: number }[];
  byMonth: { mes: string; comissao: number; premio: number }[];
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/financeiro')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }
  if (!data) {
    return <div className="p-8 text-slate-400">Não foi possível carregar os dados financeiros.</div>;
  }

  const { totals, boletos, byInsurer, byMonth } = data;
  const maxCommission = Math.max(1, ...byInsurer.map((i) => i.commission));

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-brand-600" /> Financeiro
          </h1>
          <p className="text-slate-500 text-sm mt-1">Comissões, prêmios e situação dos boletos da sua carteira.</p>
        </div>
        <Button
          id="btn-exportar-financeiro"
          variant="secondary"
          onClick={() => window.open('/api/export?type=financeiro', '_blank')}
        >
          <Download size={16} /> Exportar CSV
        </Button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Comissão da carteira"
          value={moneyShort(totals.commission)}
          hint={`${totals.policies} apólices ativas`}
          icon={<DollarSign size={20} />}
          accent="emerald"
        />
        <StatCard
          label="Prêmio da carteira"
          value={moneyShort(totals.premium)}
          hint="Total que os clientes pagam"
          icon={<FileText size={20} />}
          accent="brand"
        />
        <StatCard
          label="Comissão no mês"
          value={moneyShort(totals.commissionMonth)}
          hint="Apólices emitidas no mês"
          icon={<TrendingUp size={20} />}
          accent="violet"
        />
        <StatCard
          label="Prêmio no mês"
          value={moneyShort(totals.premiumMonth)}
          hint="Emitido neste mês"
          icon={<Wallet size={20} />}
          accent="sky"
        />
      </div>

      {/* Boletos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 size={22} /></span>
          <div>
            <p className="text-xs text-slate-500">Recebido (boletos pagos)</p>
            <p className="text-lg font-bold text-slate-800">{money(boletos.recebido)}</p>
            <p className="text-[11px] text-slate-400">{boletos.recebidoCount} boletos</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Clock size={22} /></span>
          <div>
            <p className="text-xs text-slate-500">A receber (pendentes)</p>
            <p className="text-lg font-bold text-slate-800">{money(boletos.aReceber)}</p>
            <p className="text-[11px] text-slate-400">{boletos.aReceberCount} boletos</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><AlertTriangle size={22} /></span>
          <div>
            <p className="text-xs text-slate-500">Vencidos (em atraso)</p>
            <p className="text-lg font-bold text-slate-800">{money(boletos.vencido)}</p>
            <p className="text-[11px] text-slate-400">{boletos.vencidoCount} boletos</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comissão x Prêmio por mês */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-800">Comissão e prêmio (últimos 6 meses)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="comissao" name="Comissão" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="premio" name="Prêmio" fill="#2451eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Por seguradora */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-800">Comissão por seguradora</h2>
          </div>
          {byInsurer.length === 0 ? (
            <Empty>Nenhuma apólice ativa ainda</Empty>
          ) : (
            <div className="space-y-3">
              {byInsurer.map((i) => (
                <div key={i.insurer}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 truncate">{i.insurer}</span>
                    <span className="font-bold text-slate-800 shrink-0 ml-2">{money(i.commission)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(i.commission / maxCommission) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{i.count} apólices · prêmio {money(i.premium)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
