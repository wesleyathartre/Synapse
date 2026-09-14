import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET — lista o catálogo de seguradoras (qualquer usuário autenticado)
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const data = await prisma.insurer.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ data });
}

// POST — cria uma seguradora (somente ADMIN)
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Informe o nome da seguradora' }, { status: 400 });

  const exists = await prisma.insurer.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: 'Já existe uma seguradora com esse nome' }, { status: 400 });

  const commission = Number(body.commission);
  const last = await prisma.insurer.findFirst({ orderBy: { sort: 'desc' } });
  const insurer = await prisma.insurer.create({
    data: {
      name,
      color: String(body.color || '#2451eb'),
      website: body.website ? String(body.website).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      commission: Number.isFinite(commission) ? commission : 0,
      notes: body.notes ? String(body.notes).trim() : null,
      custom: true,
      active: true,
      sort: (last?.sort ?? 0) + 1,
    },
  });
  return NextResponse.json({ insurer }, { status: 201 });
}
