'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button, Input, Select, Field, Modal, Empty } from '@/components/ui';
import { Users, Plus, Loader2, ShieldCheck, KeyRound, Power } from 'lucide-react';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'CORRETOR';
  password: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', role: 'CORRETOR', password: '' };

export default function UsuariosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') router.replace('/');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') load();
  }, [authLoading, user, load]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível criar o usuário.');
        return;
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Não foi possível atualizar.');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (u: UserRow) => patch(u.id, { active: !u.active });
  const toggleRole = (u: UserRow) => patch(u.id, { role: u.role === 'ADMIN' ? 'CORRETOR' : 'ADMIN' });
  const resetPassword = (u: UserRow) => {
    const pwd = prompt(`Nova senha para ${u.name} (mín. 8, com letra e número):`);
    if (pwd) patch(u.id, { password: pwd });
  };

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const active = users.filter((u) => u.active).length;
    return { total: users.length, admins, active };
  }, [users]);

  if (authLoading || (user && user.role !== 'ADMIN')) return null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-brand-600" /> Usuários
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} usuários · {stats.admins} admin · {stats.active} ativos
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Criar usuário
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <Empty>Nenhum usuário cadastrado.</Empty>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {u.name}
                    {u.id === user?.id && <span className="text-slate-400 font-normal"> (você)</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <Badge color={u.role === 'ADMIN' ? 'brand' : 'slate'}>{u.role === 'ADMIN' ? 'Admin' : 'Corretor'}</Badge>
                <Badge color={u.active ? 'emerald' : 'red'}>{u.active ? 'Ativo' : 'Inativo'}</Badge>
                <div className="flex items-center gap-1">
                  <button
                    title="Alternar papel (Admin/Corretor)"
                    disabled={busyId === u.id}
                    onClick={() => toggleRole(u)}
                    className="p-2 text-slate-400 hover:text-brand-600 disabled:opacity-40"
                  >
                    <ShieldCheck size={16} />
                  </button>
                  <button
                    title="Resetar senha"
                    disabled={busyId === u.id}
                    onClick={() => resetPassword(u)}
                    className="p-2 text-slate-400 hover:text-amber-600 disabled:opacity-40"
                  >
                    <KeyRound size={16} />
                  </button>
                  <button
                    title={u.active ? 'Desativar' : 'Ativar'}
                    disabled={busyId === u.id}
                    onClick={() => toggleActive(u)}
                    className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-40"
                  >
                    <Power size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Criar usuário" icon={<Plus size={18} />}>
        <form onSubmit={save} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone (opcional)">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Papel">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as FormState['role'] })}>
                <option value="CORRETOR">Corretor</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </Field>
          </div>
          <Field label="Senha (mín. 8, com letra e número)">
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Criar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
