'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button, Input, Textarea, Field, Modal, Empty } from '@/components/ui';
import { ShieldCheck, Plus, Trash2, Pencil, Loader2, Search, Globe, Phone } from 'lucide-react';

interface Insurer {
  id: string;
  name: string;
  color: string;
  website: string | null;
  phone: string | null;
  commission: number;
  notes: string | null;
  active: boolean;
  custom: boolean;
  sort: number;
}

interface FormState {
  name: string;
  color: string;
  website: string;
  phone: string;
  commission: string;
  notes: string;
}

const EMPTY_FORM: FormState = { name: '', color: '#2451eb', website: '', phone: '', commission: '', notes: '' };

export default function SeguradorasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Insurer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/insurers');
    if (res.ok) {
      const data = await res.json();
      setInsurers(data.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? insurers.filter((i) => i.name.toLowerCase().includes(q)) : insurers;
  }, [insurers, search]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (i: Insurer) => {
    setEditing(i);
    setForm({
      name: i.name,
      color: i.color,
      website: i.website || '',
      phone: i.phone || '',
      commission: i.commission ? String(i.commission) : '',
      notes: i.notes || '',
    });
    setError('');
    setShowForm(true);
  };

  const toggleActive = async (i: Insurer) => {
    setBusyId(i.id);
    try {
      await fetch(`/api/insurers/${i.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !i.active }),
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        color: form.color,
        website: form.website,
        phone: form.phone,
        commission: form.commission === '' ? 0 : Number(form.commission.replace(',', '.')),
        notes: form.notes,
      };
      const url = editing ? `/api/insurers/${editing.id}` : '/api/insurers';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      await refresh();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (i: Insurer) => {
    if (!confirm(`Excluir a seguradora "${i.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(i.id);
    try {
      const res = await fetch(`/api/insurers/${i.id}`, { method: 'DELETE' });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || (user && user.role !== 'ADMIN')) {
    return <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  const activeCount = insurers.filter((i) => i.active).length;

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-brand-600" /> Seguradoras
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre as seguradoras com quem você trabalha. {activeCount} de {insurers.length} ativas.
          </p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Nova seguradora</Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar seguradora..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Empty>Nenhuma seguradora encontrada</Empty>
      ) : (
        <Card className="divide-y divide-slate-100">
          {filtered.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm"
                style={{ backgroundColor: `${i.color}1a`, color: i.color }}
              >
                {i.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 truncate">{i.name}</p>
                  {i.commission > 0 && <Badge color="emerald">{i.commission}% comissão</Badge>}
                  {i.custom && <Badge color="blue">Personalizada</Badge>}
                  {!i.active && <Badge color="slate">Inativa</Badge>}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  {i.website && (
                    <a href={i.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-600">
                      <Globe size={11} /> Portal
                    </a>
                  )}
                  {i.phone && <span className="flex items-center gap-1"><Phone size={11} /> {i.phone}</span>}
                </div>
              </div>

              <button
                onClick={() => toggleActive(i)}
                disabled={busyId === i.id}
                title={i.active ? 'Desativar' : 'Ativar'}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${i.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${i.active ? 'translate-x-5' : ''}`} />
              </button>

              <button onClick={() => openEdit(i)} title="Editar" className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                <Pencil size={16} />
              </button>
              {i.custom && (
                <button onClick={() => remove(i)} disabled={busyId === i.id} title="Excluir" className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar seguradora' : 'Nova seguradora'}
        icon={<ShieldCheck size={18} className="text-brand-600" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={save} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold"
              style={{ backgroundColor: `${form.color}1a`, color: form.color }}
            >
              {(form.name.charAt(0) || 'S').toUpperCase()}
            </span>
            <div className="flex-1">
              <Field label="Nome da seguradora">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Suhai Seguradora" required />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Comissão padrão (%)">
              <Input
                type="text"
                inputMode="decimal"
                value={form.commission}
                onChange={(e) => setForm({ ...form, commission: e.target.value })}
                placeholder="Ex.: 20"
              />
            </Field>
            <Field label="Cor">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-[38px] border border-slate-200 rounded-lg cursor-pointer bg-white p-1"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Portal do corretor (link)">
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </Field>
            <Field label="Telefone / central">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0800 000 0000" />
            </Field>
          </div>

          <Field label="Observações">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações sobre a seguradora, contato do gerente, etc." rows={2} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
