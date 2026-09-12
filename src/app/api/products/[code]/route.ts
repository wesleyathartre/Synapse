import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PATCH — atualiza/ativa/desativa um produto (somente ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const existing = await prisma.product.findUnique({ where: { code: params.code } });
  if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') data.active = body.active;
  if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim();
  if (typeof body.category === 'string' && body.category.trim()) data.category = body.category.trim();
  if (typeof body.color === 'string') data.color = body.color;
  if (typeof body.emoji === 'string') data.emoji = body.emoji;
  if (typeof body.sort === 'number') data.sort = body.sort;

  const product = await prisma.product.update({ where: { code: params.code }, data });
  return NextResponse.json({ product });
}

// DELETE — remove um produto personalizado (somente ADMIN, e apenas custom)
export async function DELETE(_req: NextRequest, { params }: { params: { code: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const existing = await prisma.product.findUnique({ where: { code: params.code } });
  if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  if (!existing.custom) {
    return NextResponse.json(
      { error: 'Produtos padrão não podem ser excluídos. Você pode desativá-los.' },
      { status: 400 },
    );
  }

  await prisma.product.delete({ where: { code: params.code } });
  return NextResponse.json({ ok: true });
}
