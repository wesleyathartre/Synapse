'use client';

import { useEffect, useState } from 'react';
import { Plus, GripVertical, Phone, Loader2 } from 'lucide-react';
import { Modal, Field, Input, Select, Button, Badge } from '@/components/ui';
import { money, moneyShort, formatDate, cx } from '@/lib/format';
import { STAGES } from '@/lib/constants';
import { useProducts } from '@/contexts/ProductsContext';

interface Deal {
  id: string;
  title: string;
  product: string;
  stage: string;
  status: string;
  value: number;
  premium: number;
  commission: number;
  probability: number;
  expectedCloseDate: string | null;
  clientName: string;
  clientPhone: string | null;
}

const emptyForm = () => ({
  clientName: '',
  clientPhone: '',
  product: 'AUTO',
  stage: 'NOVO',
  premium: '',
  value: '',
  commission: '',
  probability: '50',
  expectedCloseDate: '',
});

export default function FunilPage() {
  const { map: PRODUCTS, groups: PRODUCT_GROUPS } = useProducts();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/deals?status=OPEN');
    const data = await res.json();
    setDeals(Array.isArray(data.data) ? data.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const byStage = (stage: string) => deals.filter((d) => d.stage === stage);
  const stageTotal = (stage: string) =>
    byStage(stage).reduce((acc, d) => acc + (d.premium || 0), 0);

  // ----- Drag & drop -----
  const onDrop = async (stage: string) => {
    setOverStage(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;

    // otimista
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    load();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(emptyForm());
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao salvar');
      }
    } finally {
      setSaving(false);
    }
  };

  const totalPipeline = deals.reduce((a, d) => a + (d.premium || 0), 0);

  return (
    <div className="p-5 md:p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Funil de Vendas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {deals.length} oportunidades · {money(totalPipeline)} em prêmios
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova oportunidade
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map((stage) => {
              const items = byStage(stage.key);
              const isOver = overStage === stage.key;
              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverStage(stage.key);
                  }}
                  onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
                  onDrop={() => onDrop(stage.key)}
                  className={cx(
                    'w-72 shrink-0 flex flex-col rounded-xl bg-slate-100/70 transition-colors',
                    isOver && 'bg-brand-50 ring-2 ring-brand-300',
                  )}
                >
                  {/* Cabeçalho da coluna */}
                  <div className="px-3 py-3 flex items-center justify-between sticky top-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                      <span className="font-bold text-sm text-slate-700">{stage.label}</span>
                      <span className="text-xs text-slate-400">({items.length})</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{moneyShort(stageTotal(stage.key))}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 no-scrollbar min-h-[120px]">
                    {items.map((deal) => {
                      const prod = PRODUCTS[deal.product] || { label: deal.product, color: '#94a3b8', emoji: '' };
                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={() => setDragId(deal.id)}
                          onDragEnd={() => setDragId(null)}
                          className={cx(
                            'bg-white rounded-lg border border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
                            dragId === deal.id && 'opacity-50',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: `${prod.color}18`, color: prod.color }}
                            >
                              {prod.emoji} {prod.label}
                            </span>
                            <GripVertical size={14} className="text-slate-300 shrink-0" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-2 leading-snug">{deal.clientName}</p>
                          {deal.clientPhone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone size={11} /> {deal.clientPhone}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2.5">
                            <span className="text-sm font-bold text-emerald-600">{money(deal.premium)}</span>
                            <Badge color="slate">{deal.probability}%</Badge>
                          </div>
                          {deal.expectedCloseDate && (
                            <p className="text-[11px] text-slate-400 mt-1.5">
                              Previsão: {formatDate(deal.expectedCloseDate)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="text-center text-xs text-slate-300 py-8 border-2 border-dashed border-slate-200 rounded-lg">
                        Arraste cards para cá
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nova oportunidade */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova oportunidade" icon={<Plus size={18} className="text-brand-600" />}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cliente *">
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nome do cliente" required />
            </Field>
            <Field label="Telefone">
              <Input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="(11) 90000-0000" />
            </Field>
            <Field label="Produto">
              <Select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                {PRODUCT_GROUPS.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Etapa">
              <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prêmio (R$)">
              <Input type="number" step="0.01" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} placeholder="0,00" />
            </Field>
            <Field label="Comissão (R$)">
              <Input type="number" step="0.01" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} placeholder="0,00" />
            </Field>
            <Field label="Probabilidade (%)">
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </Field>
            <Field label="Previsão de fechamento">
              <Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar oportunidade'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
