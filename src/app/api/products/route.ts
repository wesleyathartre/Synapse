import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET — lista o catálogo (todos os usuários autenticados usam para os formulários)
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const data = await prisma.product.findMany({
    where: { orgId: user.orgId },
    orderBy: [{ sort: 'asc' }, { label: 'asc' }],
  });
  return NextResponse.json({ data });
}

// POST — cria um produto personalizado (somente ADMIN)
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label || '').trim();
  const category = String(body.category || 'DIVERSOS').trim();
  if (!label) return NextResponse.json({ error: 'Informe o nome do produto' }, { status: 400 });

  // Gera um código a partir do rótulo (sem acentos, maiúsculo)
  let base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'PRODUTO';

  let code = base;
  let n = 1;
  while (await prisma.product.findFirst({ where: { orgId: user.orgId, code } })) {
    code = `${base}_${n++}`;
  }

  const last = await prisma.product.findFirst({ where: { orgId: user.orgId }, orderBy: { sort: 'desc' } });
  const product = await prisma.product.create({
    data: {
      orgId: user.orgId,
      code,
      label,
      category,
      color: String(body.color || '#2451eb'),
      emoji: String(body.emoji || '🏷️'),
      custom: true,
      active: true,
      sort: (last?.sort ?? 0) + 1,
    },
  });
  return NextResponse.json({ product }, { status: 201 });
}
