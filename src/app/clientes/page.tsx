'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Mail, MapPin, FileText, Target, Loader2 } from 'lucide-react';
import { Card, Modal, Field, Input, Textarea, Button, Badge, Empty } from '@/components/ui';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  cpfCnpj: string | null;
  city: string | null;
  state: string | null;
  _count?: { deals: number; policies: number };
}

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  cpfCnpj: '',
  birthDate: '',
  address: '',
  city: '',
  state: '',
  notes: '',
});

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/clients?${params}`);
    const data = await res.json();
    setClients(Array.isArray(data.data) ? data.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
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

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">Sua carteira de segurados.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Novo cliente
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : clients.length === 0 ? (
        <Card><Empty>Nenhum cliente na carteira ainda.</Empty></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
              <Link href={`/clientes/${c.id}`} className="block">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    {c.cpfCnpj && <p className="text-xs text-slate-400">{c.cpfCnpj}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{c.phone}</p>
                {c.email && <p className="flex items-center gap-1.5 truncate"><Mail size={13} className="text-slate-400" />{c.email}</p>}
                {(c.city || c.state) && (
                  <p className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" />{[c.city, c.state].filter(Boolean).join('/')}</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                <Badge color="brand"><Target size={11} className="inline mr-1" />{c._count?.deals ?? 0} negócios</Badge>
                <Badge color="emerald"><FileText size={11} className="inline mr-1" />{c._count?.policies ?? 0} apólices</Badge>
              </div>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo cliente" icon={<Users size={18} className="text-brand-600" />}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome / Razão social *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="CPF / CNPJ">
              <Input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} />
            </Field>
            <Field label="Telefone *">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="(11) 90000-0000" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Data de nascimento">
              <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </Field>
            <Field label="Endereço">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Cidade">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="UF">
              <Input value={form.state} maxLength={2} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="SP" />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar cliente'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
