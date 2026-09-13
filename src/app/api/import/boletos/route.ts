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

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.includes('/') ? raw.split('/').reverse() : raw.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
  return isNaN(d.getTime()) ? null : d;
}

type ImportError = { row: number; field: string; message: string };

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

    const cpfCnpj     = get('cpf_cnpj_cliente');
    const description = get('descricao');
    const amountStr   = get('valor');
    const dueDateStr  = get('data_vencimento');

    if (!cpfCnpj)     { errors.push({ row: i + 1, field: 'cpf_cnpj_cliente', message: 'Obrigatório' }); continue; }
    if (!description) { errors.push({ row: i + 1, field: 'descricao',        message: 'Obrigatório' }); continue; }
    if (!amountStr)   { errors.push({ row: i + 1, field: 'valor',            message: 'Obrigatório' }); continue; }
    if (!dueDateStr)  { errors.push({ row: i + 1, field: 'data_vencimento',  message: 'Obrigatório' }); continue; }

    const amount  = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount)) { errors.push({ row: i + 1, field: 'valor', message: 'Valor inválido' }); continue; }

    const dueDate = parseDate(dueDateStr);
    if (!dueDate) { errors.push({ row: i + 1, field: 'data_vencimento', message: 'Formato inválido. Use DD/MM/YYYY' }); continue; }

    // Encontra o cliente pelo CPF/CNPJ
    const client = await prisma.client.findFirst({
      where: { cpfCnpj, ownerId: user.id },
    });
    if (!client) {
      errors.push({ row: i + 1, field: 'cpf_cnpj_cliente', message: `Cliente com CPF/CNPJ "${cpfCnpj}" não encontrado. Importe os clientes primeiro.` });
      continue;
    }

    const status = ['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO'].includes(get('status').toUpperCase())
      ? get('status').toUpperCase()
      : 'PENDENTE';

    try {
      await prisma.boleto.create({
        data: {
          clientId:    client.id,
          clientName:  client.name,
          ownerId:     user.id,
          description,
          amount,
          dueDate,
          status,
          barcode:     get('linha_digitavel') || null,
          notes:       get('observacoes')     || null,
          origin:      'MANUAL',
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
    meta:   { entity: 'boletos', imported, errors: errors.length },
  });

  return NextResponse.json({ imported, errors, total: rows.length - 1 });
}
