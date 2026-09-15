'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, Mail, MapPin, User, Target, FileText,
  Receipt, Loader2, CalendarClock, CheckSquare, Clock, CheckCircle2,
  ShieldAlert, Paperclip,
} from 'lucide-react';
import { Card, Badge, Empty } from '@/components/ui';
import { money, formatDate } from '@/lib/format';
import { STAGE_MAP, POLICY_STATUS, ACTIVITY_TYPES, CLAIM_STATUS, CLAIM_TYPES } from '@/lib/constants';
import { useProducts } from '@/contexts/ProductsContext';

const BOLETO_STATUS: Record<string, { label: string; color: any }> = {
  PENDENTE: { label: 'Pendente', color: 'amber' },
  PAGO:     { label: 'Pago',     color: 'emerald' },
  VENCIDO:  { label: 'Vencido',  color: 'red' },
  CANCELADO:{ label: 'Cancelado',color: 'slate' },
};

interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  cpfCnpj: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  notes: string | null;
  deals: any[];
  policies: any[];
  boletos: any[];
  activities: any[];
  claims: any[];
}

export default function ClienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { map: PRODUCTS } = useProducts();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    fetch(`/api/clients/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClient(d))
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }
  if (!client) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Cliente não encontrado.</p>
        <Link href="/clientes" className="text-brand-600 text-sm">← Voltar</Link>
      </div>
    );
  }

  const totalPremium = client.policies.reduce((a, p) => a + (p.premium || 0), 0);
  const totalCommission = client.policies.reduce((a, p) => a + (p.commission || 0), 0);
  const openBoletos = client.boletos.filter((b) => b.status === 'PENDENTE' || b.status === 'VENCIDO');

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <button onClick={() => router.push('/clientes')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 mb-4">
        <ArrowLeft size={16} /> Voltar para clientes
      </button>

      {/* Cabeçalho do cliente */}
      <Card className="p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg shrink-0">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <User size={20} className="text-brand-600" /> {client.name}
            </h1>
            {client.cpfCnpj && <p className="text-sm text-slate-400">{client.cpfCnpj}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{client.phone}</span>
              {client.email && <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" />{client.email}</span>}
              {(client.city || client.state) && (
                <span className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" />{[client.city, client.state].filter(Boolean).join('/')}</span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Apólices</p>
            <p className="text-lg font-bold text-slate-800">{client.policies.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Prêmio total</p>
            <p className="text-lg font-bold text-slate-800">{money(totalPremium)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Comissão total</p>
            <p className="text-lg font-bold text-emerald-600">{money(totalCommission)}</p>
          </div>
        </div>
      </Card>

      {/* Histórico de atividades */}
      {client.activities.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <CheckSquare size={16} className="text-brand-600" /> Histórico de atividades
          </h2>
          <Card className="divide-y divide-slate-100">
            {client.activities.map((a) => {
              const type = ACTIVITY_TYPES[a.type] || { label: a.type, icon: 'check-square' };
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                    ${a.done ? 'bg-emerald-50 text-emerald-600' : new Date(a.dueDate) < new Date() ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {a.done ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${a.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      {type.label} · <CalendarClock size={11} /> {formatDate(a.dueDate)}
                      {a.done && a.doneAt && ` · concluída em ${formatDate(a.doneAt)}`}
                    </p>
                  </div>
                  {!a.done && new Date(a.dueDate) < new Date() && (
                    <Badge color="red">Atrasada</Badge>
                  )}
                  {a.done && <Badge color="emerald">Concluída</Badge>}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Vendas / oportunidades */}
      <section className="mb-6">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Target size={16} className="text-brand-600" /> Vendas no funil</h2>
        {client.deals.length === 0 ? (
          <Card><Empty>Nenhuma oportunidade para este cliente.</Empty></Card>
        ) : (
          <Card className="divide-y divide-slate-100">
            {client.deals.map((d) => {
              const st = STAGE_MAP[d.stage] || { label: d.stage, color: '#94a3b8' };
              const prod = PRODUCTS[d.product];
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{prod?.emoji} {prod?.label || d.product}</p>
                    <p className="text-xs text-slate-400">Comissão {money(d.commission)} · Prêmio {money(d.premium)}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${st.color}1a`, color: st.color }}>
                    {d.status === 'WON' ? 'Ganho' : st.label}
                  </span>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {/* Apólices */}
      <section className="mb-6">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><FileText size={16} className="text-brand-600" /> Apólices</h2>
        {client.policies.length === 0 ? (
          <Card><Empty>Nenhuma apólice cadastrada.</Empty></Card>
        ) : (
          <Card className="divide-y divide-slate-100">
            {client.policies.map((p) => {
              const st = POLICY_STATUS[p.status] || POLICY_STATUS.ATIVA;
              const prod = PRODUCTS[p.product];
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {prod?.emoji} {prod?.label || p.product} <span className="text-slate-400 font-mono text-xs">· {p.number}</span>
                      {p._count?.attachments > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs ml-1" title="PDF anexado">
                          <Paperclip size={11} /> {p._count.attachments}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      {p.insurer || 'Sem seguradora'} · <CalendarClock size={11} /> renova {formatDate(p.endDate)} · comissão {money(p.commission)}
                    </p>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {/* Sinistros */}
      {client.claims && client.claims.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-brand-600" /> Sinistros
          </h2>
          <Card className="divide-y divide-slate-100">
            {client.claims.map((c) => {
              const st = CLAIM_STATUS[c.status] || CLAIM_STATUS.ABERTO;
              const tp = CLAIM_TYPES[c.type] || CLAIM_TYPES.OUTRO;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {tp.label}
                      {c.number && <span className="text-slate-400 font-mono text-xs font-normal"> · {c.number}</span>}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      {c.policyNumber && <span>Apólice {c.policyNumber} · </span>}
                      <CalendarClock size={11} /> {formatDate(c.incidentDate)}
                      {c.amount > 0 && <span> · {money(c.amount)}</span>}
                    </p>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Boletos */}
      <section>
        <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Receipt size={16} className="text-brand-600" /> Boletos {openBoletos.length > 0 && <Badge color="amber">{openBoletos.length} em aberto</Badge>}
        </h2>
        {client.boletos.length === 0 ? (
          <Card><Empty>Nenhum boleto para este cliente.</Empty></Card>
        ) : (
          <Card className="divide-y divide-slate-100">
            {client.boletos.map((b) => {
              const st = BOLETO_STATUS[b.status] || BOLETO_STATUS.PENDENTE;
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{b.description}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><CalendarClock size={11} /> vence {formatDate(b.dueDate)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{money(b.amount)}</span>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
