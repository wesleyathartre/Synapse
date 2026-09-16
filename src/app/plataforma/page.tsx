'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button, Input, Select, Field, Modal, Empty, StatCard } from '@/components/ui';
import { PLANS, PLAN_CODES } from '@/lib/plans';
import { formatDate } from '@/lib/format';
import { Building2, Plus, Loader2, PlayCircle, PauseCircle, Users, Sparkles, Search, Settings2 } from 'lucide-react';
import { OrgDetailsModal } from './OrgDetailsModal';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  seatLimit: number;
  trialEndsAt: string | null;
  createdAt: string;
  _count: { users: number };
}

interface FormState {
  name: string;
  plan: string;
  status: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  plan: 'PROFISSIONAL',
  status: 'TRIAL',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  TRIAL:     { label: 'Trial',     color: 'amber' },
  ACTIVE:    { label: 'Ativa',     color: 'emerald' },
  SUSPENDED: { label: 'Suspensa',  color: 'red' },
};

export default function PlataformaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.role !== 'OWNER') router.replace('/');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/orgs');
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.orgs || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'OWNER') load();
  }, [authLoading, user, load]);

  const stats = useMemo(() => {
    const total = orgs.length;
    const active = orgs.filter((o) => o.status === 'ACTIVE').length;
    const trial = orgs.filter((o) => o.status === 'TRIAL').length;
    const suspended = orgs.filter((o) => o.status === 'SUSPENDED').length;
    const mrr = orgs
      .filter((o) => o.status === 'ACTIVE')
      .reduce((sum, o) => sum + (PLANS[o.plan as keyof typeof PLANS]?.priceMonthly || 0), 0);
    return { total, active, trial, suspended, mrr };
  }, [orgs]);

  const visibleOrgs = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orgs.filter((o) => {
      if (fStatus && o.status !== fStatus) return false;
      if (term && !`${o.name} ${o.slug}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [orgs, q, fStatus]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setError('');
    setCreated('');
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setCreated('');
    try {
      const res = await fetch('/api/platform/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível criar a corretora.');
        return;
      }
      setShowForm(false);
      setCreated(`Corretora "${data.org.name}" criada com ${data.catalog.insurers} seguradoras e ${data.catalog.products} produtos.`);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/platform/orgs/${id}`, {
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

  const activate = (o: OrgRow) => patch(o.id, { status: 'ACTIVE' });
  const suspend = (o: OrgRow) => {
    if (confirm(`Suspender "${o.name}"? Os usuários dela perderão o acesso até reativar.`)) {
      patch(o.id, { status: 'SUSPENDED' });
    }
  };
  const changePlan = (o: OrgRow, plan: string) => patch(o.id, { plan });

  if (authLoading || (user && user.role !== 'OWNER')) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-brand-600" /> Plataforma
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie as corretoras assinantes do Synapse CRM.</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Nova corretora
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Corretoras" value={stats.total} icon={<Building2 size={18} />} />
        <StatCard label="Ativas" value={stats.active} accent="emerald" icon={<PlayCircle size={18} />} />
        <StatCard label="Em trial" value={stats.trial} accent="amber" icon={<Sparkles size={18} />} />
        <StatCard label="MRR (ativas)" value={`R$ ${stats.mrr.toLocaleString('pt-BR')}`} accent="violet" icon={<Users size={18} />} />
      </div>

      {created && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          {created}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : orgs.length === 0 ? (
          <Empty>Nenhuma corretora ainda. Crie a primeira.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 flex-wrap p-3 border-b border-slate-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nome ou slug..."
                  className="!pl-9"
                />
              </div>
              <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="w-48">
                <option value="">Todas as situações</option>
                <option value="ACTIVE">Ativas</option>
                <option value="TRIAL">Em trial</option>
                <option value="SUSPENDED">Suspensas</option>
              </Select>
            </div>
            {visibleOrgs.length === 0 ? (
              <Empty>Nenhuma corretora encontrada com esse filtro.</Empty>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Corretora</th>
                  <th className="text-left px-4 py-3 font-semibold">Situação</th>
                  <th className="text-left px-4 py-3 font-semibold">Plano</th>
                  <th className="text-left px-4 py-3 font-semibold">Usuários</th>
                  <th className="text-left px-4 py-3 font-semibold">Criada</th>
                  <th className="text-right px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrgs.map((o) => {
                  const meta = STATUS_META[o.status] || { label: o.status, color: 'slate' };
                  const busy = busyId === o.id;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{o.name}</p>
                        <p className="text-xs text-slate-400">{o.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={meta.color}>{meta.label}</Badge>
                        {o.status === 'TRIAL' && o.trialEndsAt && (
                          <p className="text-[11px] text-slate-400 mt-1">até {formatDate(o.trialEndsAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={o.plan}
                          disabled={busy}
                          onChange={(e) => changePlan(o, e.target.value)}
                          className="!py-1 !text-xs w-40"
                        >
                          {PLAN_CODES.map((code) => (
                            <option key={code} value={code}>
                              {PLANS[code].label} · R$ {PLANS[code].priceMonthly}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o._count.users} / {o.seatLimit}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {busy && <Loader2 size={16} className="animate-spin text-slate-400" />}
                          <Button variant="secondary" onClick={() => setDetailId(o.id)} disabled={busy} className="!py-1 !px-2 !text-xs">
                            <Settings2 size={14} /> Gerenciar
                          </Button>
                          {o.status !== 'ACTIVE' ? (
                            <Button variant="secondary" onClick={() => activate(o)} disabled={busy} className="!py-1 !px-2 !text-xs">
                              <PlayCircle size={14} /> Ativar
                            </Button>
                          ) : (
                            <Button variant="ghost" onClick={() => suspend(o)} disabled={busy} className="!py-1 !px-2 !text-xs text-red-600">
                              <PauseCircle size={14} /> Suspender
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova corretora" icon={<Building2 size={18} />}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome da corretora">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Silva Seguros" autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Plano">
              <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                {PLAN_CODES.map((code) => (
                  <option key={code} value={code}>
                    {PLANS[code].label} · até {PLANS[code].seatLimit} · R$ {PLANS[code].priceMonthly}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Situação inicial">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="TRIAL">Trial (14 dias)</option>
                <option value="ACTIVE">Ativa</option>
              </Select>
            </Field>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Administrador da corretora</p>
            <div className="space-y-3">
              <Field label="Nome do admin">
                <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Nome completo" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail (login)">
                  <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@corretora.com" />
                </Field>
                <Field label="Senha inicial">
                  <Input type="text" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="mín. 6 caracteres" />
                </Field>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Criar corretora
            </Button>
          </div>
        </form>
      </Modal>

      {detailId && (
        <OrgDetailsModal orgId={detailId} onClose={() => setDetailId(null)} onChanged={load} />
      )}
    </div>
  );
}
