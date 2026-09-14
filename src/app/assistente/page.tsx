'use client';

import { useRef, useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { Sparkles, Send, Loader2, User2 } from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  usedAI?: boolean;
}

const SUGGESTIONS = [
  'Quais boletos vencem nos próximos 7 dias?',
  'Quantos leads quentes eu tenho e quais são?',
  'Qual o total de prêmio das apólices ativas?',
  'Tenho apólices vencendo este mês?',
  'Resuma minha carteira hoje.',
];

export default function AssistentePage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => ({}));
      const content = res.ok
        ? data.answer
        : data.error || 'Não consegui responder agora. Tente novamente.';
      setMessages((m) => [...m, { role: 'assistant', content, usedAI: data.usedAI }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles size={22} className="text-brand-600" /> Assistente
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pergunte sobre a sua carteira — as respostas usam os dados reais do seu CRM.
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[320px]">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} />
              </div>
              <p className="text-sm text-slate-500 mb-4">Comece com uma dessas perguntas:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-brand-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={m.role === 'user' ? 'flex items-start gap-2 max-w-[85%] flex-row-reverse' : 'flex items-start gap-2 max-w-[85%]'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0'
                        : 'w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0'
                    }
                  >
                    {m.role === 'user' ? <User2 size={16} /> : <Sparkles size={16} />}
                  </div>
                  <div
                    className={
                      m.role === 'user'
                        ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm'
                        : 'bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-700 whitespace-pre-wrap'
                    }
                  >
                    {m.content}
                    {m.role === 'assistant' && m.usedAI === false && (
                      <div className="mt-2">
                        <Badge color="amber">modo sem IA</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-slate-400 text-sm px-2">
                <Loader2 size={16} className="animate-spin" /> Consultando sua base...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-slate-100 p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo sobre sua carteira..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </Card>
    </div>
  );
}
