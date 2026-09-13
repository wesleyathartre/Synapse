import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';
import { audit } from '@/lib/audit';

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

function computeStatus(endDate: Date): string {
  const now = new Date();
  const days = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'VENCIDA';
  if (days <= 30) return 'A_VENCER';
  return 'ATIVA';
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

    const number   = get('numero_apolice');
    const product  = get('produto') || 'AUTO';
    const insurer  = get('seguradora');
    const clientName = get('nome_cliente');

    if (!number)     { errors.push({ row: i + 1, field: 'numero_apolice', message: 'Obrigatório' }); continue; }
    if (!clientName) { errors.push({ row: i + 1, field: 'nome_cliente',   message: 'Obrigatório' }); continue; }

    const startRaw = get('inicio_vigencia');
    const endRaw   = get('fim_vigencia');
    const startDate = startRaw ? parseDate(startRaw) : new Date();
    const endDate   = endRaw ? parseDate(endRaw) : null;

    if (!endDate) { errors.push({ row: i + 1, field: 'fim_vigencia', message: 'Obrigatório e formato válido DD/MM/YYYY' }); continue; }

    // Encontra ou cria o cliente pelo nome + telefone
    let client = await prisma.client.findFirst({
      where: { name: clientName, ownerId: user.id },
    });

    if (!client) {
      const phone = get('telefone_cliente') || '00000000000';
      client = await prisma.client.create({
        data: {
          name:    clientName,
          phone,
          email:   get('email_cliente') || null,
          ownerId: user.id,
        },
      });
    }

    try {
      await prisma.policy.upsert({
        where: { number },
        create: {
          number,
          product:    product.toUpperCase(),
          insurer:    insurer || 'Não informada',
          clientId:   client.id,
          clientName: client.name,
          premium:    Number(get('premio'))    || 0,
          commission: Number(get('comissao')) || 0,
          startDate:  startDate || new Date(),
          endDate,
          status:     get('status') || computeStatus(endDate),
          ownerId:    user.id,
          notes:      get('observacoes') || null,
        },
        update: {
          product:    product.toUpperCase(),
          insurer:    insurer || 'Não informada',
          premium:    Number(get('premio'))    || 0,
          commission: Number(get('comissao')) || 0,
          startDate:  startDate || new Date(),
          endDate,
          status:     get('status') || computeStatus(endDate),
          notes:      get('observacoes') || null,
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
    meta:   { entity: 'apolices', imported, errors: errors.length },
  });

  return NextResponse.json({ imported, errors, total: rows.length - 1 });
}
