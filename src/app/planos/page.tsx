'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, Input, Field, Empty } from '@/components/ui';
import { Tag, Loader2, Save, Check, Users, DollarSign } from 'lucide-react';

interface Plan {
  code: string;
  label: string;
  seatLimit: number;
  priceMonthly: number;
}

interface RowState {
  label: string;
  seatLimit: string;
  priceMonthly: string;
}

export default function PlanosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.role !== 'OWNER') router.replace('/');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/plans');
      if (res.ok) {
        const data = await res.json();
        const list: Plan[] = data.plans || [];
        setPlans(list);
        setRows(
          Object.fromEntries(
            list.map((p) => [
              p.code,
              { label: p.label, seatLimit: String(p.seatLimit), priceMonthly: String(p.priceMonthly) },
            ]),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'OWNER') load();
  }, [authLoading, user, load]);

  const setField = (code: string, field: keyof RowState, value: string) => {
    setRows((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
    setSavedCode(null);
  };

  const save = async (code: string) => {
    const row = rows[code];
    if (!row) return;
    setSavingCode(code);
    setSavedCode(null);
    setError('');
    try {
      const res = await fetch('/api/platform/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          label: row.label,
          seatLimit: Number(row.seatLimit),
          priceMonthly: Number(row.priceMonthly),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar.');
        return;
      }
      setPlans((prev) => prev.map((p) => (p.code === code ? data.plan : p)));
      setSavedCode(code);
    } finally {
      setSavingCode(null);
    }
  };

  if (authLoading || (user && user.role !== 'OWNER')) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Tag className="text-brand-600" /> Planos
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ajuste nome, preço mensal e limite de usuários de cada plano. As mudanças valem para novas
          corretoras e para o cálculo de receita — corretoras já existentes mantêm o limite atual até
          você trocar o plano delas.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <Empty>Não foi possível carregar os planos.</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const row = rows[p.code];
            if (!row) return null;
            const busy = savingCode === p.code;
            const saved = savedCode === p.code;
            return (
              <Card key={p.code} className="p-5 space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">{p.code}</p>
                  <Field label="Nome exibido">
                    <Input value={row.label} onChange={(e) => setField(p.code, 'label', e.target.value)} />
                  </Field>
                </div>

                <Field label="Preço mensal (R$)">
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      min={0}
                      value={row.priceMonthly}
                      onChange={(e) => setField(p.code, 'priceMonthly', e.target.value)}
                      className="!pl-8"
                    />
                  </div>
                </Field>

                <Field label="Limite de usuários">
                  <div className="relative">
                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={row.seatLimit}
                      onChange={(e) => setField(p.code, 'seatLimit', e.target.value)}
                      className="!pl-8"
                    />
                  </div>
                </Field>

                <Button onClick={() => save(p.code)} disabled={busy} className="w-full">
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : saved ? (
                    <>
                      <Check size={16} /> Salvo
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Salvar
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
