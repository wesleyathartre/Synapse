'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  StatCard,
  Badge,
  Empty,
} from '@/components/ui';
import { PLAN_CODES, PLANS } from '@/lib/plans';
import { formatDate } from '@/lib/format';
import {
  Loader2,
  Save,
  UserPlus,
  KeyRound,
  Power,
  Users,
  FileText,
  UserRound,
  Clock,
  Building2,
  History,
  LogIn,
} from 'lucide-react';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  seatLimit: number;
  trialEndsAt: string | null;
  internalNotes: string | null;
  createdAt: string;
  users: OrgUser[];
  _count: { users: number };
}

interface Metrics {
  leads: number;
  clients: number;
  policies: number;
  lastLoginAt: string | null;
}

interface AuditItem {
  id: string;
  action: string;
  email: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: 'Login',
  LOGIN_FAIL: 'Login falhou',
  REGISTER: 'Cadastro',
  PASSWORD_CHANGE: 'Troca de senha',
  DATA_EXPORT: 'Exportação de dados',
  ACCOUNT_DELETE: 'Conta excluída',
  PLATFORM_UPDATE_ORG: 'Corretora editada',
  PLATFORM_CREATE_USER: 'Usuário criado',
  PLATFORM_UPDATE_USER: 'Usuário editado',
  PLATFORM_IMPERSONATE_START: 'Acesso pela plataforma',
};

const ROLE_META: Record<string, { label: string; color: string }> = {
  OWNER: { label: 'Dono da plataforma', color: 'violet' },
  ADMIN: { label: 'Administrador', color: 'indigo' },
  CORRETOR: { label: 'Corretor', color: 'sky' },
};

export function OrgDetailsModal({
  orgId,
  onClose,
  onChanged,
}: {
  orgId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyUser, setBusyUser] = useState<string | null>(null);

  // Campos editáveis da corretora
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [seatLimit, setSeatLimit] = useState(5);
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [notes, setNotes] = useState('');

  // Novo usuário
  const [showNewUser, setShowNewUser] = useState(false);
  const [nu, setNu] = useState({ name: '', email: '', password: '', role: 'CORRETOR' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erro ao carregar a corretora.');
        return;
      }
      setOrg(data.org);
      setMetrics(data.metrics);
      setName(data.org.name);
      setPlan(data.org.plan);
      setStatus(data.org.status);
      setSeatLimit(data.org.seatLimit);
      setTrialEndsAt(data.org.trialEndsAt ? String(data.org.trialEndsAt).slice(0, 10) : '');
      setNotes(data.org.internalNotes ?? '');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/audit`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLogs(data.logs || []);
    } catch {
      /* silencioso */
    }
  }, [orgId]);

  useEffect(() => {
    load();
    loadAudit();
  }, [load, loadAudit]);

  const saveOrg = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, plan, status, seatLimit, trialEndsAt: trialEndsAt || null, internalNotes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar.');
        return;
      }
      setMsg('Alterações salvas.');
      await load();
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const userAction = async (
    userId: string,
    body: Record<string, unknown>,
    okMsg: string | null,
  ) => {
    setBusyUser(userId);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar usuário.');
        return;
      }
      if (okMsg) setMsg(okMsg);
      await load();
      onChanged();
    } finally {
      setBusyUser(null);
    }
  };

  const resetPass = async (u: OrgUser) => {
    const pw = window.prompt(`Nova senha para ${u.email} (mín. 6 caracteres):`);
    if (!pw) return;
    if (pw.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    await userAction(u.id, { newPassword: pw }, `Senha de ${u.email} redefinida.`);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyUser('new');
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nu),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erro ao criar usuário.');
        return;
      }
      setMsg(`Usuário ${nu.email} criado.`);
      setNu({ name: '', email: '', password: '', role: 'CORRETOR' });
      setShowNewUser(false);
      await load();
      onChanged();
    } finally {
      setBusyUser(null);
    }
  };

  const seatsUsed = org?._count.users ?? 0;
  const seatsFull = org ? seatsUsed >= org.seatLimit : false;

  const impersonate = async () => {
    setImpersonating(true);
    setError('');
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/impersonate`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível acessar como esta corretora.');
        setImpersonating(false);
        return;
      }
      // Recarrega o app inteiro já como a corretora.
      window.location.href = '/';
    } catch {
      setError('Não foi possível acessar como esta corretora.');
      setImpersonating(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={org ? org.name : 'Corretora'}
      icon={<Building2 size={18} />}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !org ? (
        <Empty>{error || 'Não foi possível carregar a corretora.'}</Empty>
      ) : (
        <div className="space-y-6">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {msg && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>
          )}

          {/* Mini-dashboard de uso */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Leads" value={metrics?.leads ?? 0} icon={<Users size={18} />} accent="brand" />
            <StatCard label="Clientes" value={metrics?.clients ?? 0} icon={<UserRound size={18} />} accent="emerald" />
            <StatCard label="Apólices" value={metrics?.policies ?? 0} icon={<FileText size={18} />} accent="violet" />
            <StatCard
              label="Último acesso"
              value={metrics?.lastLoginAt ? formatDate(metrics.lastLoginAt) : '—'}
              icon={<Clock size={18} />}
              accent="sky"
            />
          </div>

          {/* Ação de plataforma: acessar como a corretora */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">
              Acesse o sistema como esta corretora para dar suporte. Uma faixa ficará visível e você
              pode voltar quando quiser.
            </p>
            <Button
              variant="secondary"
              onClick={impersonate}
              disabled={impersonating}
              className="!py-1.5 !px-3 !text-xs"
            >
              {impersonating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LogIn size={14} />
              )}
              Entrar como esta corretora
            </Button>
          </div>

          {/* Dados da corretora */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Dados da corretora</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Slug (identificador)">
                <Input value={org.slug} disabled className="bg-slate-50 text-slate-400" />
              </Field>
              <Field label="Plano">
                <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
                  {PLAN_CODES.map((code) => (
                    <option key={code} value={code}>
                      {PLANS[code].label} — R$ {PLANS[code].priceMonthly}/mês
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Situação">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="TRIAL">Em teste (trial)</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="SUSPENDED">Suspensa</option>
                </Select>
              </Field>
              <Field label="Limite de usuários (assentos)">
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={seatLimit}
                  onChange={(e) => setSeatLimit(Number(e.target.value))}
                />
              </Field>
              <Field label="Fim do teste (trial)">
                <Input
                  type="date"
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Anotações internas (só a plataforma vê)">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: contato do responsável, combinados de cobrança, observações..."
              />
            </Field>
            <div className="flex justify-end">
              <Button onClick={saveOrg} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar alterações
              </Button>
            </div>
          </div>

          {/* Usuários */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700">
                Usuários{' '}
                <span className="text-slate-400 font-normal">
                  ({seatsUsed}/{org.seatLimit})
                </span>
              </h4>
              <Button
                variant="secondary"
                onClick={() => setShowNewUser((v) => !v)}
                disabled={seatsFull}
                className="!py-1.5 !px-3 !text-xs"
              >
                <UserPlus size={14} />
                Adicionar usuário
              </Button>
            </div>

            {seatsFull && !showNewUser && (
              <p className="text-xs text-amber-600">
                Limite de assentos atingido. Aumente o limite acima para adicionar mais usuários.
              </p>
            )}

            {showNewUser && (
              <form
                onSubmit={createUser}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4"
              >
                <Field label="Nome">
                  <Input
                    value={nu.name}
                    onChange={(e) => setNu({ ...nu, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="E-mail">
                  <Input
                    type="email"
                    value={nu.email}
                    onChange={(e) => setNu({ ...nu, email: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Senha inicial (mín. 6)">
                  <Input
                    type="text"
                    value={nu.password}
                    onChange={(e) => setNu({ ...nu, password: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Papel">
                  <Select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
                    <option value="CORRETOR">Corretor</option>
                    <option value="ADMIN">Administrador</option>
                  </Select>
                </Field>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewUser(false)}
                    className="!py-1.5 !px-3 !text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={busyUser === 'new'} className="!py-1.5 !px-3 !text-xs">
                    {busyUser === 'new' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    Criar
                  </Button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {org.users.length === 0 ? (
                <Empty>Nenhum usuário nesta corretora.</Empty>
              ) : (
                org.users.map((u) => {
                  const meta = ROLE_META[u.role] || ROLE_META.CORRETOR;
                  const busy = busyUser === u.id;
                  const isOwner = u.role === 'OWNER';
                  return (
                    <div
                      key={u.id}
                      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {u.name}{' '}
                          {!u.active && <Badge color="red">Inativo</Badge>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <Badge color={meta.color}>{meta.label}</Badge>
                      {!isOwner && (
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={u.role}
                            disabled={busy}
                            onChange={(e) => userAction(u.id, { role: e.target.value }, null)}
                            className="!w-auto !py-1 !px-2 !text-xs"
                          >
                            <option value="CORRETOR">Corretor</option>
                            <option value="ADMIN">Administrador</option>
                          </Select>
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => resetPass(u)}
                            title="Redefinir senha"
                            className="!py-1 !px-2 !text-xs"
                          >
                            <KeyRound size={14} />
                          </Button>
                          <Button
                            variant={u.active ? 'ghost' : 'secondary'}
                            disabled={busy}
                            onClick={() => userAction(u.id, { active: !u.active }, null)}
                            title={u.active ? 'Desativar' : 'Ativar'}
                            className="!py-1 !px-2 !text-xs"
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Power size={14} className={u.active ? 'text-red-500' : 'text-emerald-600'} />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Atividade recente */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <History size={16} /> Atividade recente
            </h4>
            {logs.length === 0 ? (
              <Empty>Sem atividade registrada.</Empty>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700">
                        {ACTION_LABEL[l.action] || l.action}
                      </p>
                      {l.email && <p className="text-xs text-slate-400 truncate">{l.email}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatDate(l.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
