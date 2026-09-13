'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Users,
  UserPlus,
  Receipt,
  ChevronRight,
  X,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { cx } from '@/lib/format';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Entity = 'clientes' | 'apolices' | 'leads' | 'boletos';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  imported: number;
  errors: ImportError[];
  total: number;
}

// ── Templates CSV ─────────────────────────────────────────────────────────────
const TEMPLATES: Record<Entity, { header: string; example: string }> = {
  clientes: {
    header: 'nome,email,telefone,cpf_cnpj,data_nascimento,endereco,cidade,estado,observacoes',
    example: 'João da Silva,joao@email.com,(11) 99999-0000,123.456.789-00,15/06/1985,Rua das Flores 100,São Paulo,SP,Cliente indicado por Maria',
  },
  apolices: {
    header: 'numero_apolice,produto,seguradora,nome_cliente,email_cliente,telefone_cliente,premio,comissao,inicio_vigencia,fim_vigencia,status,observacoes',
    example: 'PS-2024-00001,AUTO,Porto Seguro,João da Silva,joao@email.com,(11) 99999-0000,1500.00,150.00,01/01/2024,31/12/2024,ATIVA,',
  },
  leads: {
    header: 'nome,email,telefone,origem,interesse,status,temperatura,observacoes',
    example: 'Maria Oliveira,maria@email.com,(11) 98888-0000,INSTAGRAM,AUTO,NOVO,QUENTE,Veio pelo story do Instagram',
  },
  boletos: {
    header: 'cpf_cnpj_cliente,descricao,valor,data_vencimento,status,linha_digitavel,observacoes',
    example: '123.456.789-00,Parcela 1/12 - Consórcio Auto,850.00,15/01/2025,PENDENTE,,',
  },
};

const ENTITY_CONFIG: Record<Entity, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  clientes: {
    label: 'Clientes',
    icon: <Users size={22} />,
    color: 'brand',
    description: 'Importe sua base de clientes com todos os dados de contato.',
  },
  apolices: {
    label: 'Apólices',
    icon: <FileText size={22} />,
    color: 'emerald',
    description: 'Importe apólices existentes. Clientes novos são criados automaticamente.',
  },
  leads: {
    label: 'Leads',
    icon: <UserPlus size={22} />,
    color: 'amber',
    description: 'Importe prospects e leads de outras fontes ou sistemas.',
  },
  boletos: {
    label: 'Boletos',
    icon: <Receipt size={22} />,
    color: 'violet',
    description: 'Importe boletos a vencer. O cliente deve existir pelo CPF/CNPJ.',
  },
};

// ── Download do template ──────────────────────────────────────────────────────
function downloadTemplate(entity: Entity) {
  const t    = TEMPLATES[entity];
  const csv  = `${t.header}\n${t.example}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `synapse_template_${entity}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Exporta erros ─────────────────────────────────────────────────────────────
function downloadErrors(errors: ImportError[], entity: Entity) {
  const header = 'linha,campo,mensagem\n';
  const rows   = errors.map((e) => `${e.row},${e.field},"${e.message}"`).join('\n');
  const blob   = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `synapse_erros_${entity}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Preview CSV ───────────────────────────────────────────────────────────────
function parsePreview(text: string, maxRows = 5): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim())
    .slice(0, maxRows + 1)
    .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ImportacaoPage() {
  const [step,     setStep]    = useState<1 | 2 | 3>(1);
  const [entity,   setEntity]  = useState<Entity | null>(null);
  const [file,     setFile]    = useState<File | null>(null);
  const [preview,  setPreview] = useState<string[][]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading] = useState(false);
  const [result,   setResult]  = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Handlers de arquivo ─────────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      alert('Apenas arquivos .csv são aceitos.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parsePreview(text));
    };
    reader.readAsText(f, 'utf-8');
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file || !entity) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch(`/api/import/${entity}`, { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
      setStep(3);
    } catch {
      alert('Erro ao processar o arquivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1);
    setEntity(null);
    setFile(null);
    setPreview([]);
    setResult(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Upload size={28} className="text-brand-600" />
          Importação de Dados
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Migre dados de outros sistemas via planilha CSV padronizada
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Tipo de dado' },
          { n: 2, label: 'Upload e validação' },
          { n: 3, label: 'Resultado' },
        ].map(({ n, label }, i, arr) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={cx(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
              step > n  ? 'bg-emerald-500 text-white' :
              step === n ? 'bg-brand-600 text-white'  :
              'bg-slate-200 text-slate-500',
            )}>
              {step > n ? <CheckCircle2 size={16} /> : n}
            </div>
            <span className={cx(
              'text-sm font-medium hidden sm:block',
              step === n ? 'text-slate-800' : 'text-slate-400',
            )}>{label}</span>
            {i < arr.length - 1 && (
              <div className="flex-1 h-0.5 bg-slate-200 mx-1">
                <div className={cx('h-full bg-brand-600 transition-all', step > n ? 'w-full' : 'w-0')} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Etapa 1: Escolha da entidade ── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-slate-700 mb-4">Que tipo de dado deseja importar?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.entries(ENTITY_CONFIG) as [Entity, typeof ENTITY_CONFIG[Entity]][]).map(([key, cfg]) => (
              <button
                key={key}
                id={`btn-entity-${key}`}
                onClick={() => { setEntity(key); setStep(2); }}
                className={cx(
                  'flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-98',
                  entity === key
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 bg-white hover:border-brand-300',
                )}
              >
                <div className={cx(
                  'p-2.5 rounded-lg shrink-0',
                  cfg.color === 'brand'   ? 'bg-brand-100 text-brand-600'   :
                  cfg.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                  cfg.color === 'amber'   ? 'bg-amber-100 text-amber-600'   :
                  'bg-violet-100 text-violet-600',
                )}>
                  {cfg.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{cfg.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{cfg.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Etapa 2: Upload ── */}
      {step === 2 && entity && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-700">
              Importar {ENTITY_CONFIG[entity].label}
            </h2>
            <button
              onClick={() => { setStep(1); setFile(null); setPreview([]); }}
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              ← Voltar
            </button>
          </div>

          {/* Download template */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                <Download size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">Baixe o template antes de importar</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use o arquivo modelo como base. As colunas devem estar na ordem correta.
                  Campos marcados com * são obrigatórios.
                </p>
              </div>
              <Button
                id={`btn-download-template-${entity}`}
                variant="secondary"
                onClick={() => downloadTemplate(entity)}
                className="shrink-0"
              >
                <Download size={16} /> Template
              </Button>
            </div>
            {/* Preview do header */}
            <div className="mt-3 p-2 bg-slate-50 rounded-lg overflow-x-auto">
              <code className="text-[11px] text-slate-500 whitespace-nowrap">
                {TEMPLATES[entity].header}
              </code>
            </div>
          </Card>

          {/* Área de upload */}
          <div
            id="drop-zone"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cx(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              dragging   ? 'border-brand-400 bg-brand-50' :
              file       ? 'border-emerald-400 bg-emerald-50' :
              'border-slate-300 hover:border-brand-400 hover:bg-slate-50',
            )}
          >
            <input
              ref={fileRef}
              id="file-input"
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={40} className="text-emerald-500" />
                <p className="font-semibold text-emerald-700">{file.name}</p>
                <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreview([]); }}
                  className="text-xs text-red-500 hover:text-red-700 mt-1"
                >
                  <X size={14} className="inline" /> Remover
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Upload size={40} className="text-slate-400" />
                <p className="font-semibold">Arraste o arquivo CSV aqui</p>
                <p className="text-sm">ou clique para selecionar</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">
                  Preview — primeiras {Math.min(preview.length, 5)} linhas
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {preview[0].map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="hover:bg-slate-50">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[200px] truncate">
                            {cell || <span className="text-slate-300 italic">vazio</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              id="btn-importar"
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Importando...</>
              ) : (
                <>Importar <ChevronRight size={18} /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Etapa 3: Resultado ── */}
      {step === 3 && result && entity && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-700">Resultado da importação</h2>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-800">{result.total}</p>
              <p className="text-xs text-slate-500 mt-1">Total de linhas</p>
            </Card>
            <Card className="p-4 text-center border-emerald-200">
              <p className="text-3xl font-bold text-emerald-600">{result.imported}</p>
              <p className="text-xs text-slate-500 mt-1">Importados</p>
            </Card>
            <Card className="p-4 text-center border-red-200">
              <p className="text-3xl font-bold text-red-500">{result.errors.length}</p>
              <p className="text-xs text-slate-500 mt-1">Com erro</p>
            </Card>
          </div>

          {/* Banner de sucesso/parcial */}
          {result.errors.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">
                  Importação concluída com sucesso!
                </p>
                <p className="text-sm text-emerald-700">
                  Todos os {result.imported} registros foram importados.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={24} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">
                  Importação parcial — {result.errors.length} erro(s) encontrado(s)
                </p>
                <p className="text-sm text-amber-700">
                  {result.imported} registros foram importados. Corrija os erros abaixo e reimporte.
                </p>
              </div>
            </div>
          )}

          {/* Tabela de erros */}
          {result.errors.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <p className="text-sm font-semibold text-slate-700">
                  Erros encontrados
                </p>
                <Button
                  id="btn-download-erros"
                  variant="secondary"
                  onClick={() => downloadErrors(result.errors, entity)}
                >
                  <Download size={16} /> Baixar CSV de erros
                </Button>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-slate-500 font-semibold">Linha</th>
                      <th className="px-4 py-2 text-left text-slate-500 font-semibold">Campo</th>
                      <th className="px-4 py-2 text-left text-slate-500 font-semibold">Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map((err, i) => (
                      <tr key={i} className="hover:bg-red-50">
                        <td className="px-4 py-2 font-mono text-red-600 font-bold">{err.row}</td>
                        <td className="px-4 py-2 text-slate-600">{err.field}</td>
                        <td className="px-4 py-2 text-slate-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            <Button id="btn-nova-importacao" variant="secondary" onClick={reset}>
              Nova importação
            </Button>
            <Button id="btn-reimportar" onClick={() => { setStep(2); setResult(null); }}>
              Corrigir e reimportar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
