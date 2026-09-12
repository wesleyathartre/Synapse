'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, UserPlus, ArrowRightCircle, Phone, Mail, Loader2 } from 'lucide-react';
import { Card, Modal, Field, Input, Select, Textarea, Button, Badge, Empty } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { LEAD_STATUS, LEAD_SOURCES, LEAD_TEMP } from '@/lib/constants';
import { useProducts } from '@/contexts/ProductsContext';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  interest: string;
  status: string;
  temp: string;
  createdAt: string;
}

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  source: 'SITE',
  interest: 'AUTO',
  temp: 'MORNO',
  status: 'NOVO',
  notes: '',
});

export default function LeadsPage() {
  const { map: PRODUCTS, groups: PRODUCT_GROUPS } = useProducts();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(Array.isArray(data.data) ? data.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
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

  const convert = async (lead: Lead) => {
    if (!confirm(`Converter "${lead.name}" em cliente e criar oportunidade no funil?`)) return;
    const res = await fetch(`/api/leads/${lead.id}`, { method: 'POST' });
    if (res.ok) {
      alert('Lead convertido! Uma oportunidade foi criada no funil.');
      load();
    } else {
      alert('Erro ao converter lead');
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Contatos no topo do funil aguardando qualificação.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Novo lead
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-52">
          <option value="">Todos os status</option>
          {Object.entries(LEAD_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : leads.length === 0 ? (
          <Empty>Nenhum lead encontrado. Clique em “Novo lead” para começar.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Contato</th>
                  <th className="px-4 py-3 font-semibold">Interesse</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Origem</th>
                  <th className="px-4 py-3 font-semibold">Temp.</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const st = LEAD_STATUS[lead.status] || LEAD_STATUS.NOVO;
                  const tp = LEAD_TEMP[lead.temp] || LEAD_TEMP.MORNO;
                  const prod = PRODUCTS[lead.interest];
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{lead.name}</p>
                        <p className="text-xs text-slate-400 md:hidden">{lead.phone}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                        <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" />{lead.phone}</span>
                        {lead.email && <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Mail size={11} />{lead.email}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{prod?.emoji} {prod?.label || lead.interest}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-500">{LEAD_SOURCES[lead.source] || lead.source}</td>
                      <td className="px-4 py-3"><Badge color={tp.color}>{tp.label}</Badge></td>
                      <td className="px-4 py-3"><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {lead.status !== 'CONVERTIDO' ? (
                          <button
                            onClick={() => convert(lead)}
                            title="Converter em cliente + oportunidade"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <ArrowRightCircle size={16} /> Converter
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">✓ Convertido</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo lead" icon={<UserPlus size={18} className="text-brand-600" />}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Telefone *">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="(11) 90000-0000" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Produto de interesse">
              <Select value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
                {PRODUCT_GROUPS.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Origem">
              <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Temperatura">
              <Select value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })}>
                {Object.entries(LEAD_TEMP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Observações">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar lead'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
