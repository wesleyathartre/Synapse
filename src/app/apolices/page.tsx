'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, FileText, Loader2, CalendarClock, Paperclip, Upload, Download, Trash2 } from 'lucide-react';
import { Card, Modal, Field, Input, Select, Button, Badge, Empty } from '@/components/ui';
import { money, formatDate, daysUntil } from '@/lib/format';
import { POLICY_STATUS } from '@/lib/constants';
import { useProducts } from '@/contexts/ProductsContext';

interface Policy {
  id: string;
  number: string;
  product: string;
  insurer: string;
  clientName: string;
  premium: number;
  commission: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface ClientOpt {
  id: string;
  name: string;
}

const emptyForm = () => ({
  number: '',
  product: 'AUTO',
  insurer: '',
  clientId: '',
  premium: '',
  commission: '',
  startDate: '',
  endDate: '',
  paymentType: 'UNICO',
  installments: '1',
});

export default function ApolicesPage() {
  const { map: PRODUCTS, groups: PRODUCT_GROUPS } = useProducts();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [insurers, setInsurers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Anexos (PDF) da apólice
  const [attachPolicy, setAttachPolicy] = useState<Policy | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState('');

  // Mapa seguradora → comissão padrão (para cálculo automático)
  const [insurerCommissionMap, setInsurerCommissionMap] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/policies?${params}`);
    const data = await res.json();
    setPolicies(Array.isArray(data.data) ? data.data : []);
    setLoading(false);
  };

  const loadClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(Array.isArray(data.data) ? data.data : []);
  };

  const loadInsurers = async () => {
    const res = await fetch('/api/insurers');
    if (res.ok) {
      const data = await res.json();
      const active = (data.data || []).filter((i: any) => i.active);
      setInsurers(active.map((i: any) => i.name));
      // Monta mapa nome → comissão padrão
      const map: Record<string, number> = {};
      active.forEach((i: any) => { map[i.name] = i.commission ?? 0; });
      setInsurerCommissionMap(map);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    loadClients();
    loadInsurers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/policies', {
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

  const totalCommission = policies.reduce((a, p) => a + (p.commission || 0), 0);

  const openAttachments = async (p: Policy) => {
    setAttachPolicy(p);
    setAttachError('');
    setAttachments([]);
    setAttachLoading(true);
    try {
      const res = await fetch(`/api/policies/${p.id}/attachments`);
      const data = await res.json();
      setAttachments(Array.isArray(data.data) ? data.data : []);
    } finally {
      setAttachLoading(false);
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!attachPolicy) return;
    setAttachError('');
    if (file.type !== 'application/pdf') {
      setAttachError('Somente arquivos PDF são aceitos.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAttachError('O arquivo deve ter até 8 MB.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/policies/${attachPolicy.id}/attachments`, { method: 'POST', body: fd });
      if (res.ok) {
        await openAttachments(attachPolicy);
      } else {
        const err = await res.json().catch(() => ({}));
        setAttachError(err.error || 'Não foi possível enviar o arquivo.');
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (att: Attachment) => {
    if (!attachPolicy) return;
    if (!confirm(`Excluir "${att.filename}"?`)) return;
    const res = await fetch(`/api/policies/${attachPolicy.id}/attachments/${att.id}`, { method: 'DELETE' });
    if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Apólices</h1>
          <p className="text-slate-500 text-sm mt-1">
            {policies.length} apólices · {money(totalCommission)} em comissão
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova apólice
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Buscar por número ou cliente..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-52">
          <option value="">Todos os status</option>
          {Object.entries(POLICY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : policies.length === 0 ? (
          <Empty>Nenhuma apólice cadastrada.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Apólice</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Produto</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Prêmio</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Comissão</th>
                  <th className="px-4 py-3 font-semibold">Renovação</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Anexo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((p) => {
                  const st = POLICY_STATUS[p.status] || POLICY_STATUS.ATIVA;
                  const prod = PRODUCTS[p.product];
                  const d = daysUntil(p.endDate);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.number}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.clientName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{prod?.emoji} {prod?.label || p.product}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600">{money(p.premium)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell font-semibold text-emerald-600">{money(p.commission)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="flex items-center gap-1">
                          <CalendarClock size={13} className="text-slate-400" />
                          {formatDate(p.endDate)}
                          {p.status !== 'CANCELADA' && d <= 30 && (
                            <span className={d <= 0 ? 'text-red-500 text-xs font-bold' : 'text-amber-500 text-xs font-bold'}>
                              ({d <= 0 ? 'vencida' : `${d}d`})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          title="Anexar/ver PDF da apólice"
                          onClick={() => openAttachments(p)}
                          className="p-2 text-slate-400 hover:text-brand-600"
                        >
                          <Paperclip size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova apólice" icon={<FileText size={18} className="text-brand-600" />}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nº da apólice *">
              <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required placeholder="PS-2026-00001" />
            </Field>
            <Field label="Cliente *">
              <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                <option value="">Selecione...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
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
            <Field label="Seguradora">
              <Input
                list="insurers-list"
                placeholder="Digite ou selecione a seguradora"
                value={form.insurer}
                onChange={(e) => {
                  const name = e.target.value;
                  const pct = insurerCommissionMap[name];
                  // Se há comissão padrão e prêmio preenchido, calcula automaticamente
                  if (pct && form.premium) {
                    const calc = (parseFloat(form.premium) * pct) / 100;
                    setForm({ ...form, insurer: name, commission: calc.toFixed(2) });
                  } else {
                    setForm({ ...form, insurer: name });
                  }
                }}
              />
              <datalist id="insurers-list">
                {insurers.map((name) => <option key={name} value={name} />)}
              </datalist>
              {form.insurer && insurerCommissionMap[form.insurer] ? (
                <p className="text-[11px] text-slate-400 mt-1">
                  Comissão padrão: <span className="font-semibold text-emerald-600">{insurerCommissionMap[form.insurer]}%</span> — calculada automaticamente ao preencher o prêmio.
                </p>
              ) : null}
            </Field>
            <Field label="Prêmio (R$)">
              <Input
                type="number" step="0.01"
                value={form.premium}
                onChange={(e) => {
                  const premium = e.target.value;
                  const pct = insurerCommissionMap[form.insurer];
                  if (pct && premium) {
                    const calc = (parseFloat(premium) * pct) / 100;
                    setForm({ ...form, premium, commission: calc.toFixed(2) });
                  } else {
                    setForm({ ...form, premium });
                  }
                }}
              />
            </Field>
            <Field label="Comissão (R$)">
              <Input type="number" step="0.01" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
            </Field>
            <Field label="Forma de pagamento">
              <Select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
                <option value="UNICO">À vista (único)</option>
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </Select>
            </Field>
            <Field label="Nº de parcelas">
              <Input
                type="number"
                min="1"
                max="12"
                value={form.installments}
                disabled={form.paymentType === 'UNICO'}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
              />
            </Field>
            <Field label="Início da vigência">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="Renovação (fim) *">
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </Field>
          </div>
          {clients.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Cadastre um cliente antes de emitir uma apólice.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || clients.length === 0}>{saving ? 'Salvando...' : 'Salvar apólice'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!attachPolicy}
        onClose={() => setAttachPolicy(null)}
        title={attachPolicy ? `Anexos — ${attachPolicy.number}` : 'Anexos'}
        icon={<Paperclip size={18} className="text-brand-600" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Anexe o PDF da apólice ou endossos (até 8 MB por arquivo).
          </p>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-6 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition-colors">
            {uploading ? (
              <Loader2 size={22} className="animate-spin text-brand-600" />
            ) : (
              <Upload size={22} className="text-slate-400" />
            )}
            <span className="text-sm text-slate-500">{uploading ? 'Enviando...' : 'Clique para escolher um PDF'}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAttachment(f);
                e.target.value = '';
              }}
            />
          </label>

          {attachError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{attachError}</div>
          )}

          {attachLoading ? (
            <div className="py-6 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum arquivo anexado ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-3 px-3 py-2.5">
                  <FileText size={18} className="text-red-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{att.filename}</p>
                    <p className="text-xs text-slate-400">{(att.size / 1024).toFixed(0)} KB · {formatDate(att.createdAt)}</p>
                  </div>
                  <a
                    href={`/api/policies/${attachPolicy?.id}/attachments/${att.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir / baixar"
                    className="p-2 text-slate-400 hover:text-brand-600"
                  >
                    <Download size={16} />
                  </a>
                  <button title="Excluir" onClick={() => deleteAttachment(att)} className="p-2 text-slate-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setAttachPolicy(null)}>Fechar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
