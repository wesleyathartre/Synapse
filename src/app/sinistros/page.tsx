'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ShieldAlert, Loader2, CalendarClock, Trash2, Pencil } from 'lucide-react';
import { Card, Modal, Field, Input, Select, Textarea, Button, Badge, Empty, StatCard } from '@/components/ui';
import { money, formatDate } from '@/lib/format';
import { CLAIM_STATUS, CLAIM_TYPES } from '@/lib/constants';

interface Claim {
  id: string;
  number: string | null;
  clientId: string;
  clientName: string;
  policyId: string | null;
  policyNumber: string | null;
  insurer: string | null;
  product: string;
  type: string;
  status: string;
  description: string | null;
  incidentDate: string;
  amount: number;
  notes: string | null;
}

interface ClientOpt { id: string; name: string }
interface PolicyOpt { id: string; number: string; clientId: string; insurer: string; product: string }

const emptyForm = () => ({
  id: '',
  clientId: '',
  policyId: '',
  number: '',
  type: 'COLISAO',
  status: 'ABERTO',
  incidentDate: '',
  amount: '',
  description: '',
  notes: '',
});

export default function SinistrosPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, paid: 0, amount: 0 });
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [policies, setPolicies] = useState<PolicyOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/claims?${params}`);
    const data = await res.json();
    setClaims(Array.isArray(data.data) ? data.data : []);
    setSummary(data.summary || { total: 0, open: 0, paid: 0, amount: 0 });
    setLoading(false);
  };

  const loadRefs = async () => {
    const [rc, rp] = await Promise.all([fetch('/api/clients'), fetch('/api/policies')]);
    const dc = await rc.json();
    const dp = await rp.json();
    setClients(Array.isArray(dc.data) ? dc.data : []);
    setPolicies(Array.isArray(dp.data) ? dp.data : []);
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { loadRefs(); }, []);

  const openNew = () => { setForm(emptyForm()); setShowForm(true); };
  const openEdit = (c: Claim) => {
    setForm({
      id: c.id,
      clientId: c.clientId,
      policyId: c.policyId || '',
      number: c.number || '',
      type: c.type,
      status: c.status,
      incidentDate: c.incidentDate ? c.incidentDate.slice(0, 10) : '',
      amount: c.amount ? String(c.amount) : '',
      description: c.description || '',
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const clientPolicies = useMemo(
    () => policies.filter((p) => p.clientId === form.clientId),
    [policies, form.clientId],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const editing = !!form.id;
      const res = await fetch(editing ? `/api/claims/${form.id}` : '/api/claims', {
        method: editing ? 'PATCH' : 'POST',
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

  const remove = async (c: Claim) => {
    if (!confirm(`Excluir o sinistro de ${c.clientName}?`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/claims/${c.id}`, { method: 'DELETE' });
      if (res.ok) load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert size={26} className="text-brand-600" /> Sinistros
          </h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe avarias e acionamentos dos seus clientes.</p>
        </div>
        <Button onClick={openNew}><Plus size={18} /> Novo sinistro</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total" value={summary.total} icon={<ShieldAlert size={18} />} />
        <StatCard label="Em aberto" value={summary.open} accent="amber" icon={<CalendarClock size={18} />} />
        <StatCard label="Pagos" value={summary.paid} accent="emerald" />
        <StatCard label="Valor envolvido" value={money(summary.amount)} accent="violet" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Buscar por cliente, número do sinistro ou apólice..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-52">
          <option value="">Todos os status</option>
          {Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : claims.length === 0 ? (
          <Empty>Nenhum sinistro registrado.</Empty>
        ) : (
          <div className="divide-y divide-slate-100">
            {claims.map((c) => {
              const st = CLAIM_STATUS[c.status] || CLAIM_STATUS.ABERTO;
              const tp = CLAIM_TYPES[c.type] || CLAIM_TYPES.OUTRO;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">
                      {c.clientName}
                      {c.number && <span className="text-slate-400 font-mono text-xs font-normal"> · {c.number}</span>}
                    </p>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2">
                      <span>{tp.label}</span>
                      {c.policyNumber && <span>· Apólice {c.policyNumber}</span>}
                      {c.insurer && <span>· {c.insurer}</span>}
                      <span className="flex items-center gap-1"><CalendarClock size={11} /> {formatDate(c.incidentDate)}</span>
                    </p>
                  </div>
                  {c.amount > 0 && <span className="text-sm font-bold text-slate-800 hidden sm:block">{money(c.amount)}</span>}
                  <Badge color={st.color}>{st.label}</Badge>
                  <div className="flex items-center gap-1">
                    <button title="Editar" disabled={busyId === c.id} onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-brand-600 disabled:opacity-40">
                      <Pencil size={15} />
                    </button>
                    <button title="Excluir" disabled={busyId === c.id} onClick={() => remove(c)} className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={form.id ? 'Editar sinistro' : 'Novo sinistro'} icon={<ShieldAlert size={18} className="text-brand-600" />}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cliente *">
              <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, policyId: '' })} required disabled={!!form.id}>
                <option value="">Selecione...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Apólice (opcional)">
              <Select value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })} disabled={!form.clientId || !!form.id}>
                <option value="">Sem apólice vinculada</option>
                {clientPolicies.map((p) => <option key={p.id} value={p.id}>{p.number} · {p.insurer}</option>)}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(CLAIM_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Nº do sinistro (seguradora)">
              <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Ex.: SIN-2026-123" />
            </Field>
            <Field label="Data do ocorrido">
              <Input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
            </Field>
            <Field label="Valor estimado / indenização (R$)">
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
          </div>
          <Field label="Descrição do ocorrido">
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que aconteceu..." />
          </Field>
          <Field label="Observações internas">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {form.status === 'ABERTO' && !form.id && clients.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Cadastre um cliente antes de abrir um sinistro.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.clientId}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
