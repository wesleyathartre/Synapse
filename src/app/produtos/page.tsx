'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, ProductItem } from '@/contexts/ProductsContext';
import { Card, Badge, Button, Input, Select, Field, Modal, Empty } from '@/components/ui';
import { Package, Plus, Trash2, Pencil, Loader2, Search } from 'lucide-react';

const EMOJI_SUGGESTIONS = ['🏷️', '🚗', '🏍️', '🚚', '⛵', '🏠', '🏢', '🏭', '🌾', '🛠️', '❤️', '🩺', '🦷', '📱', '💻', '🚲', '🐶', '✈️', '🛡️', '🔑', '📋', '🏦', '💰', '📈', '🏡', '🚛', '🧾', '🩹'];

interface FormState {
  code?: string;
  label: string;
  emoji: string;
  color: string;
  category: string;
}

export default function ProdutosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { products, categories, loading, refresh } = useProducts();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<FormState>({ label: '', emoji: '🏷️', color: '#2451eb', category: 'DIVERSOS' });
  const [saving, setSaving] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') router.replace('/');
  }, [authLoading, user, router]);

  const catLabel = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.key, c.label])),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.label.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const grouped = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, items: filtered.filter((p) => p.category === c.key) }))
        .filter((g) => g.items.length > 0),
    [categories, filtered],
  );

  const openNew = () => {
    setEditing(null);
    setForm({ label: '', emoji: '🏷️', color: '#2451eb', category: categories[0]?.key || 'DIVERSOS' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (p: ProductItem) => {
    setEditing(p);
    setForm({ code: p.code, label: p.label, emoji: p.emoji, color: p.color, category: p.category });
    setError('');
    setShowForm(true);
  };

  const toggleActive = async (p: ProductItem) => {
    setBusyCode(p.code);
    try {
      await fetch(`/api/products/${p.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      });
      await refresh();
    } finally {
      setBusyCode(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = editing ? `/api/products/${editing.code}` : '/api/products';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const remove = async (p: ProductItem) => {
    if (!confirm(`Excluir o produto "${p.label}"? Esta ação não pode ser desfeita.`)) return;
    setBusyCode(p.code);
    try {
      const res = await fetch(`/api/products/${p.code}`, { method: 'DELETE' });
      if (res.ok) await refresh();
    } finally {
      setBusyCode(null);
    }
  };

  if (authLoading || (user && user.role !== 'ADMIN')) {
    return <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  const activeCount = products.filter((p) => p.active).length;

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-brand-600" /> Catálogo de Produtos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ative, desative e crie produtos ofertados. {activeCount} de {products.length} ativos.
          </p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Novo produto</Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : grouped.length === 0 ? (
        <Empty>Nenhum produto encontrado</Empty>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.key}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{g.label}</h2>
              <Card className="divide-y divide-slate-100">
                {g.items.map((p) => (
                  <div key={p.code} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${p.color}1a` }}
                    >
                      {p.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 truncate">{p.label}</p>
                        {p.custom && <Badge color="blue">Personalizado</Badge>}
                        {!p.active && <Badge color="slate">Inativo</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{p.code}</p>
                    </div>

                    <button
                      onClick={() => toggleActive(p)}
                      disabled={busyCode === p.code}
                      title={p.active ? 'Desativar' : 'Ativar'}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${p.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${p.active ? 'translate-x-5' : ''}`} />
                    </button>

                    <button onClick={() => openEdit(p)} title="Editar" className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                      <Pencil size={16} />
                    </button>
                    {p.custom && (
                      <button onClick={() => remove(p)} disabled={busyCode === p.code} title="Excluir" className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar produto' : 'Novo produto'}
        icon={<Package size={18} className="text-brand-600" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={save} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: `${form.color}1a` }}
            >
              {form.emoji}
            </span>
            <div className="flex-1">
              <Field label="Nome do produto">
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: Seguro Drone" required />
              </Field>
            </div>
          </div>

          <Field label="Ícone (emoji)">
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_SUGGESTIONS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setForm({ ...form, emoji: em })}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${form.emoji === em ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoria">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
