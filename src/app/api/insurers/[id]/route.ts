import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PATCH — atualiza/ativa/desativa uma seguradora (somente ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const existing = await prisma.insurer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Seguradora não encontrada' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') data.active = body.active;
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.color === 'string') data.color = body.color;
  if (typeof body.website === 'string') data.website = body.website.trim() || null;
  if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null;
  if (body.commission !== undefined) {
    const c = Number(body.commission);
    if (Number.isFinite(c)) data.commission = c;
  }
  if (typeof body.sort === 'number') data.sort = body.sort;

  // Evita nome duplicado
  if (typeof data.name === 'string' && data.name !== existing.name) {
    const dup = await prisma.insurer.findUnique({ where: { name: data.name } });
    if (dup) return NextResponse.json({ error: 'Já existe uma seguradora com esse nome' }, { status: 400 });
  }

  const insurer = await prisma.insurer.update({ where: { id: params.id }, data });
  return NextResponse.json({ insurer });
}

// DELETE — remove uma seguradora criada pelo usuário (somente ADMIN, e apenas custom)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const existing = await prisma.insurer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Seguradora não encontrada' }, { status: 404 });
  if (!existing.custom) {
    return NextResponse.json(
      { error: 'Seguradoras padrão não podem ser excluídas. Você pode desativá-las.' },
      { status: 400 },
    );
  }

  await prisma.insurer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
