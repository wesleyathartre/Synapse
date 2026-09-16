import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { audit } from '@/lib/audit';

// Utilitários de parsing CSV minimalista (sem dependências externas)
function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          cols.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      cols.push(cur.trim());
      return cols;
    });
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // aceita DD/MM/YYYY e YYYY-MM-DD
  const parts = raw.includes('/') ? raw.split('/').reverse() : raw.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
  return isNaN(d.getTime()) ? null : d;
}

type ImportError = { row: number; field: string; message: string };

// ── POST /api/import/clientes ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // Lê o arquivo do form-data
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Campo "file" não encontrado' }, { status: 400 });

  const text   = await file.text();
  const rows   = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });

  // Mapeia cabeçalho
  const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z_]/g, ''));
  const errors: ImportError[] = [];
  let imported = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get  = (col: string) => row[header.indexOf(col)]?.trim() || '';

    const name  = get('nome');
    const phone = get('telefone');

    if (!name)  { errors.push({ row: i + 1, field: 'nome',     message: 'Campo obrigatório' }); continue; }
    if (!phone) { errors.push({ row: i + 1, field: 'telefone', message: 'Campo obrigatório' }); continue; }

    const birthRaw = get('data_nascimento');
    const birthDate = birthRaw ? parseDate(birthRaw) : null;
    if (birthRaw && !birthDate) {
      errors.push({ row: i + 1, field: 'data_nascimento', message: 'Formato inválido. Use DD/MM/YYYY ou YYYY-MM-DD' });
      continue;
    }

    try {
      await prisma.client.upsert({
        where: {
          // upsert por CPF/CNPJ se informado, senão cria sempre
          cpfCnpj: get('cpf_cnpj') || undefined,
        } as any,
        create: {
          name,
          phone,
          email:    get('email')    || null,
          cpfCnpj: get('cpf_cnpj') || null,
          birthDate,
          address:  get('endereco') || null,
          city:     get('cidade')   || null,
          state:    get('estado') ? String(get('estado')).toUpperCase().slice(0, 2) : null,
          notes:    get('observacoes') || null,
          orgId:    user.orgId,
          ownerId:  user.id,
        },
        update: {
          name,
          phone,
          email:    get('email')    || null,
          birthDate,
          address:  get('endereco') || null,
          city:     get('cidade')   || null,
          state:    get('estado') ? String(get('estado')).toUpperCase().slice(0, 2) : null,
          notes:    get('observacoes') || null,
        },
      });
      imported++;
    } catch (e: any) {
      errors.push({ row: i + 1, field: 'geral', message: e?.message || 'Erro ao inserir' });
    }
  }

  // Auditoria
  await audit({
    userId: user.id,
    action: 'DATA_IMPORT',
    meta:   { entity: 'clientes', imported, errors: errors.length },
  });

  return NextResponse.json({ imported, errors, total: rows.length - 1 });
}
