'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, Textarea, Badge, Empty } from '@/components/ui';
import { Wrench, Play, Loader2, AlertTriangle, Download, Database } from 'lucide-react';

interface ReadResult {
  type: 'read';
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}
interface WriteResult {
  type: 'write';
  affected: number;
}
type SqlResult = ReadResult | WriteResult;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = columns.map(esc).join(',');
  const body = rows.map((r) => columns.map((c) => esc(cellText(r[c]))).join(',')).join('\n');
  return `${head}\n${body}`;
}

export default function FerramentasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [sql, setSql] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SqlResult | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.role !== 'OWNER') router.replace('/');
  }, [authLoading, user, router]);

  const run = useCallback(
    async (confirm: boolean) => {
      if (!sql.trim()) return;
      setRunning(true);
      setError('');
      if (!confirm) {
        setResult(null);
        setNeedsConfirm(false);
      }
      try {
        const res = await fetch('/api/platform/sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql, confirm }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Erro ao executar.');
          setNeedsConfirm(false);
          return;
        }
        if (data.needsConfirm) {
          setNeedsConfirm(true);
          return;
        }
        setNeedsConfirm(false);
        setResult(data);
      } finally {
        setRunning(false);
      }
    },
    [sql],
  );

  const read = result?.type === 'read' ? result : null;

  const downloadCsv = () => {
    if (!read) return;
    const blob = new Blob([toCsv(read.columns, read.rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run(false);
    }
  };

  const rowsView = useMemo(() => (read ? read.rows : []), [read]);

  if (authLoading || (user && user.role !== 'OWNER')) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wrench className="text-brand-600" /> Ferramentas
        </h1>
        <p className="text-sm text-slate-500 mt-1">Console SQL da plataforma — uso exclusivo do OWNER.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <p>
          Você está conectado ao banco de <strong>produção</strong>. Consultas <code>SELECT</code> rodam
          direto; comandos que alteram dados (UPDATE, DELETE, etc.) pedem confirmação e ficam registrados
          na auditoria. Tenha atenção com <code>WHERE</code> em comandos de escrita.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={onKeyDown}
          rows={6}
          placeholder='Ex.: SELECT id, name, email, role FROM "User" ORDER BY "createdAt" DESC LIMIT 20;'
          className="font-mono text-xs"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-slate-400">Dica: Ctrl+Enter executa. Nomes de tabela/coluna com maiúsculas precisam de aspas duplas.</p>
          <Button onClick={() => run(false)} disabled={running || !sql.trim()}>
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Executar
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 whitespace-pre-wrap font-mono">
          {error}
        </div>
      )}

      {needsConfirm && (
        <div className="rounded-lg bg-red-50 border border-red-300 text-red-800 text-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-2">
            <AlertTriangle size={18} />
            Este comando <strong>altera dados</strong> em produção. Confirma a execução?
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setNeedsConfirm(false)} className="!py-1.5 !px-3 !text-xs">
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => run(true)} disabled={running} className="!py-1.5 !px-3 !text-xs">
              {running ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              Confirmar execução
            </Button>
          </div>
        </div>
      )}

      {result?.type === 'write' && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          Comando executado. Linhas afetadas: <strong>{result.affected}</strong>.
        </div>
      )}

      {read && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Database size={16} className="text-slate-400" />
              {read.rowCount} linha(s){read.truncated && ' · exibindo as primeiras 1000'}
            </p>
            {read.rows.length > 0 && (
              <Button variant="secondary" onClick={downloadCsv} className="!py-1.5 !px-3 !text-xs">
                <Download size={14} /> Exportar CSV
              </Button>
            )}
          </div>
          {read.rows.length === 0 ? (
            <Empty>A consulta não retornou linhas.</Empty>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    {read.columns.map((c) => (
                      <th key={c} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rowsView.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      {read.columns.map((c) => (
                        <td key={c} className="px-3 py-1.5 align-top font-mono text-slate-700 max-w-[320px] truncate">
                          {cellText(r[c]) || <span className="text-slate-300">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!result && !error && !needsConfirm && (
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exemplos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {[
              'SELECT id, name, slug, plan, status, "seatLimit" FROM "Organization" ORDER BY "createdAt" DESC;',
              'SELECT role, count(*) FROM "User" GROUP BY role;',
              'SELECT action, count(*) FROM "AuditLog" GROUP BY action ORDER BY count(*) DESC;',
            ].map((q) => (
              <Button key={q} variant="secondary" onClick={() => setSql(q)} className="!py-1.5 !px-3 !text-xs font-mono">
                {q.length > 60 ? q.slice(0, 60) + '…' : q}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
