'use client';

import { useEffect, useState } from 'react';
import { Plus, CheckSquare, Loader2, Phone, MessageCircle, Mail, Users, Square, CheckCircle2 } from 'lucide-react';
import { Card, Modal, Field, Input, Select, Textarea, Button, Badge, Empty } from '@/components/ui';
import { formatDateTime, daysUntil, cx } from '@/lib/format';
import { ACTIVITY_TYPES } from '@/lib/constants';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  dueDate: string;
  done: boolean;
  deal?: { title: string; clientName: string } | null;
}

const typeIcon: Record<string, any> = {
  LIGACAO: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  REUNIAO: Users,
  TAREFA: CheckSquare,
};

const emptyForm = () => ({
  type: 'TAREFA',
  title: '',
  description: '',
  dueDate: '',
});

export default function TarefasPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/activities?filter=${filter}`);
    const data = await res.json();
    setItems(Array.isArray(data.data) ? data.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const toggle = async (a: Activity) => {
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    await fetch(`/api/activities/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !a.done }),
    });
    load();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/activities', {
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

  const filters = [
    { key: 'PENDING', label: 'Pendentes' },
    { key: 'DONE', label: 'Concluídas' },
    { key: 'ALL', label: 'Todas' },
  ];

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Tarefas & Agenda</h1>
          <p className="text-slate-500 text-sm mt-1">Follow-ups, ligações e compromissos.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova tarefa
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cx(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              filter === f.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><Empty>Nenhuma tarefa aqui. Bom trabalho! 🎉</Empty></Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const Icon = typeIcon[a.type] || CheckSquare;
            const d = daysUntil(a.dueDate);
            const overdue = !a.done && d < 0;
            const today = !a.done && d === 0;
            return (
              <Card key={a.id} className={cx('p-4 flex items-start gap-3', a.done && 'opacity-60')}>
                <button onClick={() => toggle(a)} className="mt-0.5 text-brand-600 hover:scale-110 transition-transform">
                  {a.done ? <CheckCircle2 size={22} /> : <Square size={22} className="text-slate-300" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-slate-400 shrink-0" />
                    <p className={cx('font-semibold text-slate-800', a.done && 'line-through')}>{a.title}</p>
                  </div>
                  {a.description && <p className="text-sm text-slate-500 mt-0.5">{a.description}</p>}
                  {a.deal && (
                    <p className="text-xs text-brand-600 mt-1">Relacionado: {a.deal.clientName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-400">{formatDateTime(a.dueDate)}</span>
                    <Badge color="slate">{ACTIVITY_TYPES[a.type]?.label || a.type}</Badge>
                    {overdue && <Badge color="red">Atrasada</Badge>}
                    {today && <Badge color="amber">Hoje</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova tarefa" icon={<CheckSquare size={18} className="text-brand-600" />} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Título *">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Ligar para confirmar cotação" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Data e hora *">
              <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar tarefa'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
