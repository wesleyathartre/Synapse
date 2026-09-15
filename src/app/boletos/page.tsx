'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  MessageCircle,
  Mail,
  Copy,
  Loader2,
  Receipt,
  AlertTriangle,
  Clock,
  CalendarCheck,
  TrendingUp,
  ChevronDown,
  X,
  Download,
} from 'lucide-react';
import {
  Card,
  Modal,
  Field,
  Input,
  Select,
  Button,
  Badge,
  StatCard,
  Empty,
} from '@/components/ui';
import { money, formatDate, daysUntil, cx } from '@/lib/format';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ClientOpt {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PolicyOpt {
  id: string;
  number: string;
  product: string;
  paymentType?: string;
  installments?: number;
}

interface Boleto {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  barcode?: string;
  notes?: string;
  origin: string;
  installmentNumber?: number;
  installmentTotal?: number;
  clientId: string;
  clientName: string;
  policyId?: string;
  client: { id: string; name: string; email?: string; phone?: string };
  policy?: { id: string; number: string; product: string };
}

// ── Configurações de status ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE:  { label: 'Pendente',  color: 'amber',   icon: <Clock size={14} /> },
  PAGO:      { label: 'Pago',      color: 'emerald', icon: <CheckCircle2 size={14} /> },
  VENCIDO:   { label: 'Vencido',   color: 'red',     icon: <AlertTriangle size={14} /> },
  CANCELADO: { label: 'Cancelado', color: 'slate',   icon: <X size={14} /> },
};

// ── Urgência ──────────────────────────────────────────────────────────────────
function urgencyClass(dueDate: string, status: string): string {
  if (status === 'PAGO' || status === 'CANCELADO') return '';
  const d = daysUntil(dueDate);
  if (d < 0)  return 'border-l-4 border-red-500';
  if (d === 0) return 'border-l-4 border-red-400';
  if (d <= 3)  return 'border-l-4 border-amber-400';
  return 'border-l-4 border-emerald-400';
}

// ── Gera link WhatsApp ────────────────────────────────────────────────────────
function buildWhatsappLink(boleto: Boleto): string {
  const phone = boleto.client.phone?.replace(/\D/g, '') || '';
  const date  = formatDate(boleto.dueDate);
  const text  = [
    `Olá, ${boleto.client.name}! 👋`,
    ``,
    `Passando para lembrar que seu boleto vence em *${date}*.`,
    ``,
    `📄 *${boleto.description}*`,
    `💰 *Valor: ${money(boleto.amount)}*`,
    boleto.barcode ? `🔑 *Linha digitável:* ${boleto.barcode}` : '',
    ``,
    `Qualquer dúvida, estou à disposição! 😊`,
  ].filter(Boolean).join('\n');
  return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
}

// ── Gera link mailto ──────────────────────────────────────────────────────────
function buildMailtoLink(boleto: Boleto): string {
  const email   = boleto.client.email || '';
  const subject = encodeURIComponent(`Lembrete: boleto vence em ${formatDate(boleto.dueDate)}`);
  const body    = encodeURIComponent([
    `Olá, ${boleto.client.name}!`,
    ``,
    `Este é um lembrete sobre seu boleto que vence em ${formatDate(boleto.dueDate)}.`,
    ``,
    `Descrição: ${boleto.description}`,
    `Valor: ${money(boleto.amount)}`,
    boleto.barcode ? `Linha digitável: ${boleto.barcode}` : '',
    ``,
    `Qualquer dúvida, estou à disposição!`,
  ].filter(Boolean).join('\n'));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

// ── Form vazio ────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  clientId:    '',
  policyId:    '',
  description: '',
  amount:      '',
  dueDate:     '',
  barcode:     '',
  notes:       '',
  fromPolicy:  false,
});

// ── Componente principal ──────────────────────────────────────────────────────
export default function BoletosPage() {
  const [boletos,    setBoletos]    = useState<Boleto[]>([]);
  const [clients,    setClients]    = useState<ClientOpt[]>([]);
  const [policies,   setPolicies]   = useState<PolicyOpt[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [rangeFilter, setRangeFilter] = useState('week');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(emptyForm());
  const [saving,     setSaving]     = useState(false);
  const [copied,     setCopied]     = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    overdue: 0, today: 0, in3days: 0, week: 0, totalAmount: 0,
  });

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (rangeFilter)  params.set('range',  rangeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (search)       params.set('search', search);

    const res  = await fetch(`/api/boletos?${params}`);
    const data = await res.json();
    const list: Boleto[] = Array.isArray(data.data) ? data.data : [];

    setBoletos(list);

    // Calcula estatísticas locais
    const now   = new Date();
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const in3d  = new Date(); in3d.setDate(in3d.getDate() + 3); in3d.setHours(23, 59, 59, 999);
    const in7d  = new Date(); in7d.setDate(in7d.getDate() + 7); in7d.setHours(23, 59, 59, 999);

    const pending = list.filter((b) => b.status === 'PENDENTE' || b.status === 'VENCIDO');
    setStats({
      overdue:     pending.filter((b) => new Date(b.dueDate) < now).length,
      today:       pending.filter((b) => new Date(b.dueDate) <= today && new Date(b.dueDate) >= now).length,
      in3days:     pending.filter((b) => new Date(b.dueDate) <= in3d && new Date(b.dueDate) > today).length,
      week:        pending.filter((b) => new Date(b.dueDate) <= in7d && new Date(b.dueDate) > in3d).length,
      totalAmount: pending.reduce((sum, b) => sum + b.amount, 0),
    });

    setLoading(false);
  }, [rangeFilter, statusFilter, search]);

  useEffect(() => { load(); }, [rangeFilter, statusFilter]);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((d) =>
      setClients(Array.isArray(d.data) ? d.data : []),
    );
    fetch('/api/policies').then((r) => r.json()).then((d) =>
      setPolicies(Array.isArray(d.data) ? d.data : []),
    );
  }, []);

  // ── Ações ──────────────────────────────────────────────────────────────────
  const markPaid = async (id: string) => {
    await fetch(`/api/boletos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAGO' }),
    });
    load();
  };

  const copyBarcode = (barcode: string, id: string) => {
    navigator.clipboard.writeText(barcode);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = { ...form, amount: Number(form.amount) };
      if (!form.policyId) delete body.policyId;
      const res = await fetch('/api/boletos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // Filtra apólices do cliente selecionado
  const clientPolicies = form.clientId
    ? policies.filter((p: any) => p.clientId === form.clientId || true)
    : policies;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={28} className="text-brand-600" />
            Boletos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie os boletos a vencer e envie avisos aos clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            id="btn-exportar-boletos"
            variant="secondary"
            onClick={() => {
              const url = '/api/export?type=boletos';
              window.open(url, '_blank');
            }}
          >
            <Download size={16} /> Exportar CSV
          </Button>
          <Button id="btn-novo-boleto" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Novo boleto
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Vencidos"
          value={stats.overdue}
          hint="Aguardando pagamento"
          icon={<AlertTriangle size={20} />}
          accent="red"
        />
        <StatCard
          label="Vencem hoje"
          value={stats.today}
          hint="Urgente"
          icon={<Clock size={20} />}
          accent="red"
        />
        <StatCard
          label="Próximos 3 dias"
          value={stats.in3days}
          hint="Atenção"
          icon={<CalendarCheck size={20} />}
          accent="amber"
        />
        <StatCard
          label="Total a receber"
          value={money(stats.totalAmount)}
          hint="Pendentes da semana"
          icon={<TrendingUp size={20} />}
          accent="emerald"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            id="search-boletos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Buscar por cliente ou descrição..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <Select
          id="filter-range"
          value={rangeFilter}
          onChange={(e) => setRangeFilter(e.target.value)}
          className="sm:w-44"
        >
          <option value="week">Esta semana</option>
          <option value="today">Hoje</option>
          <option value="overdue">Vencidos</option>
          <option value="">Todos</option>
        </Select>
        <Select
          id="filter-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-40"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      </div>

      {/* Lista */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : boletos.length === 0 ? (
          <Empty>
            Nenhum boleto encontrado.{' '}
            {rangeFilter === 'week' && 'Não há boletos a vencer esta semana. 🎉'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Vencimento</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boletos.map((b) => {
                  const d   = daysUntil(b.dueDate);
                  const st  = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDENTE;
                  return (
                    <tr key={b.id} className={cx('hover:bg-slate-50/70 transition-colors', urgencyClass(b.dueDate, b.status))}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{b.clientName}</p>
                        {b.client.phone && (
                          <p className="text-xs text-slate-400">{b.client.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                        <span>{b.description}</span>
                        {b.installmentTotal && b.installmentTotal > 1 && (
                          <span className="ml-1 text-xs text-slate-400">
                            ({b.installmentNumber}/{b.installmentTotal})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{money(b.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="flex flex-col">
                          <span>{formatDate(b.dueDate)}</span>
                          {b.status !== 'PAGO' && b.status !== 'CANCELADO' && (
                            <span className={cx(
                              'text-xs font-semibold',
                              d < 0  ? 'text-red-500'   :
                              d === 0 ? 'text-red-500'  :
                              d <= 3  ? 'text-amber-500' :
                              'text-slate-400',
                            )}>
                              {d < 0 ? `${Math.abs(d)}d atraso` : d === 0 ? 'Vence hoje' : `${d}d`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={st.color} className="flex items-center gap-1 w-fit">
                          {st.icon}{st.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Marcar pago */}
                          {b.status === 'PENDENTE' || b.status === 'VENCIDO' ? (
                            <button
                              id={`btn-pago-${b.id}`}
                              onClick={() => markPaid(b.id)}
                              title="Marcar como pago"
                              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          ) : null}
                          {/* WhatsApp */}
                          {b.client.phone && (b.status === 'PENDENTE' || b.status === 'VENCIDO') && (
                            <a
                              id={`btn-whatsapp-${b.id}`}
                              href={buildWhatsappLink(b)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Enviar via WhatsApp"
                              className="p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}
                          {/* Email */}
                          {b.client.email && (b.status === 'PENDENTE' || b.status === 'VENCIDO') && (
                            <a
                              id={`btn-email-${b.id}`}
                              href={buildMailtoLink(b)}
                              title="Enviar por e-mail"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Mail size={18} />
                            </a>
                          )}
                          {/* Copiar linha digitável */}
                          {b.barcode && (
                            <button
                              id={`btn-copiar-${b.id}`}
                              onClick={() => copyBarcode(b.barcode!, b.id)}
                              title="Copiar linha digitável"
                              className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              {copied === b.id ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Copy size={18} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de novo boleto */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setForm(emptyForm()); }}
        title="Novo boleto"
        icon={<Receipt size={18} className="text-brand-600" />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle manual/auto */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              id="tab-manual"
              onClick={() => setForm({ ...form, fromPolicy: false })}
              className={cx(
                'flex-1 py-2 rounded-md text-sm font-semibold transition-colors',
                !form.fromPolicy ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500',
              )}
            >
              Manual
            </button>
            <button
              type="button"
              id="tab-auto"
              onClick={() => setForm({ ...form, fromPolicy: true })}
              className={cx(
                'flex-1 py-2 rounded-md text-sm font-semibold transition-colors',
                form.fromPolicy ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500',
              )}
            >
              Gerar da apólice
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cliente *">
              <Select
                id="select-cliente"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>

            {form.fromPolicy ? (
              <Field label="Apólice *">
                <Select
                  id="select-apolice"
                  value={form.policyId}
                  onChange={(e) => {
                    const p = policies.find((p) => p.id === e.target.value);
                    setForm({
                      ...form,
                      policyId: e.target.value,
                      description: p ? `Parcelas — ${p.number}` : form.description,
                    });
                  }}
                  required={form.fromPolicy}
                >
                  <option value="">Selecione a apólice...</option>
                  {clientPolicies.map((p) => (
                    <option key={p.id} value={p.id}>{p.number}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Apólice (opcional)">
                <Select
                  id="select-apolice-opt"
                  value={form.policyId}
                  onChange={(e) => setForm({ ...form, policyId: e.target.value })}
                >
                  <option value="">Nenhuma</option>
                  {clientPolicies.map((p) => (
                    <option key={p.id} value={p.id}>{p.number}</option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Descrição *">
              <Input
                id="input-descricao"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                placeholder="Ex: Parcela 1/12 – Consórcio Auto"
              />
            </Field>

            <Field label="Valor (R$) *">
              <Input
                id="input-valor"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                placeholder="0,00"
              />
            </Field>

            <Field label="Vencimento *">
              <Input
                id="input-vencimento"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Linha digitável (opcional)">
              <Input
                id="input-barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
              />
            </Field>
          </div>

          <Field label="Observações">
            <Input
              id="input-obs"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas internas..."
            />
          </Field>

          {form.fromPolicy && form.policyId && (
            <div className="p-3 bg-brand-50 rounded-lg text-xs text-brand-700">
              As parcelas serão geradas automaticamente conforme a periodicidade da apólice.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowForm(false); setForm(emptyForm()); }}
            >
              Cancelar
            </Button>
            <Button id="btn-salvar-boleto" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : form.fromPolicy ? 'Gerar parcelas' : 'Salvar boleto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
