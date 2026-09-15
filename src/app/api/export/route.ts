/**
 * GET /api/export/boletos
 * GET /api/export/financeiro
 * ─────────────────────────────────────────────────────────────────────────────
 * Exporta dados em formato CSV para planilhas / contabilidade.
 *
 * Parâmetros (boletos):
 *   status  — filtra por status (PAGO | PENDENTE | VENCIDO | CANCELADO)
 *   from    — data inicial (ISO)
 *   to      — data final (ISO)
 *
 * Parâmetros (financeiro):
 *   from, to — período de emissão das apólices
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export const dynamic = 'force-dynamic';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Encapsula com aspas se contém vírgula, aspas ou quebra de linha
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n'); // BOM para Excel reconhecer UTF-8
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatMoney(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

// ─── GET /api/export/boletos ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type') || 'boletos'; // 'boletos' | 'financeiro'
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (type === 'financeiro') {
    // Exporta apólices da carteira ativa
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const policies = await prisma.policy.findMany({
      where: {
        ...where,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        number: true,
        clientName: true,
        product: true,
        insurer: true,
        premium: true,
        commission: true,
        status: true,
        startDate: true,
        endDate: true,
        paymentType: true,
        installments: true,
        createdAt: true,
      },
    });

    const headers = [
      'Apólice', 'Cliente', 'Produto', 'Seguradora',
      'Prêmio (R$)', 'Comissão (R$)', 'Status',
      'Início', 'Renovação', 'Pagamento', 'Parcelas', 'Emitida em',
    ];
    const rows = policies.map((p) => [
      p.number,
      p.clientName,
      p.product,
      p.insurer,
      formatMoney(p.premium),
      formatMoney(p.commission),
      p.status,
      formatDate(p.startDate),
      formatDate(p.endDate),
      p.paymentType,
      p.installments,
      formatDate(p.createdAt),
    ]);

    const csv = toCSV(headers, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synapse-apolices-${Date.now()}.csv"`,
      },
    });
  }

  // type === 'boletos'
  const filter: any = { ...where };
  if (status) filter.status = status;
  if (from || to) {
    filter.dueDate = {};
    if (from) filter.dueDate.gte = new Date(from);
    if (to) filter.dueDate.lte = new Date(to);
  }

  const boletos = await prisma.boleto.findMany({
    where: filter,
    orderBy: { dueDate: 'asc' },
    select: {
      clientName: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      paidAt: true,
      origin: true,
      barcode: true,
      notes: true,
      policy: { select: { number: true } },
    },
  });

  const headers = [
    'Cliente', 'Descrição', 'Valor (R$)', 'Vencimento',
    'Status', 'Pago em', 'Apólice', 'Origem', 'Código de barras', 'Observações',
  ];
  const rows = boletos.map((b) => [
    b.clientName,
    b.description,
    formatMoney(b.amount),
    formatDate(b.dueDate),
    b.status,
    b.paidAt ? formatDate(b.paidAt) : '',
    b.policy?.number || '',
    b.origin,
    b.barcode || '',
    b.notes || '',
  ]);

  const csv = toCSV(headers, rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="synapse-boletos-${Date.now()}.csv"`,
    },
  });
}
