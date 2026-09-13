import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { audit } from '@/lib/audit';

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.filter((l) => l.trim().length > 0).map((line) => {
    const cols: string[] = [];
    let cur = ''; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });
}

type ImportError = { row: number; field: string; message: string };

const VALID_STATUS  = ['NOVO', 'EM_CONTATO', 'QUALIFICADO', 'CONVERTIDO', 'PERDIDO'];
const VALID_TEMP    = ['FRIO', 'MORNO', 'QUENTE'];
const VALID_SOURCES = ['SITE', 'INDICACAO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'LIGACAO', 'EVENTO', 'OUTRO'];

export async function POST(req: NextRequest) {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Campo "file" não encontrado' }, { status: 400 });

  const text   = await file.text();
  const rows   = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });

  const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z_]/g, ''));
  const errors: ImportError[] = [];
  let imported = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (col: string) => row[header.indexOf(col)]?.trim() || '';

    const name  = get('nome');
    const phone = get('telefone');

    if (!name)  { errors.push({ row: i + 1, field: 'nome',     message: 'Obrigatório' }); continue; }
    if (!phone) { errors.push({ row: i + 1, field: 'telefone', message: 'Obrigatório' }); continue; }

    const status = VALID_STATUS.includes(get('status').toUpperCase())
      ? get('status').toUpperCase()
      : 'NOVO';
    const temp   = VALID_TEMP.includes(get('temperatura').toUpperCase())
      ? get('temperatura').toUpperCase()
      : 'MORNO';
    const source = VALID_SOURCES.includes(get('origem').toUpperCase())
      ? get('origem').toUpperCase()
      : 'OUTRO';

    try {
      await prisma.lead.create({
        data: {
          name,
          phone,
          email:   get('email')     || null,
          source,
          interest: get('interesse') || 'AUTO',
          status,
          temp,
          notes:   get('observacoes') || null,
          ownerId: user.id,
        },
      });
      imported++;
    } catch (e: any) {
      errors.push({ row: i + 1, field: 'geral', message: e?.message || 'Erro ao inserir' });
    }
  }

  await audit({
    userId: user.id,
    action: 'DATA_IMPORT',
    meta:   { entity: 'leads', imported, errors: errors.length },
  });

  return NextResponse.json({ imported, errors, total: rows.length - 1 });
}
