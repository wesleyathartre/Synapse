import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

export async function GET(req: NextRequest) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const filter = req.nextUrl.searchParams.get('filter') || 'PENDING'; // PENDING | DONE | ALL
  const w: any = { ...where };
  if (filter === 'PENDING') w.done = false;
  if (filter === 'DONE') w.done = true;

  const data = await prisma.activity.findMany({
    where: w,
    orderBy: [{ done: 'asc' }, { dueDate: 'asc' }],
    include: { deal: { select: { title: true, clientName: true } } },
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.dueDate) {
    return NextResponse.json({ error: 'Título e data são obrigatórios' }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      type: body.type || 'TAREFA',
      title: body.title,
      description: body.description || null,
      dueDate: new Date(body.dueDate),
      dealId: body.dealId || null,
      clientId: body.clientId || null,
      leadId: body.leadId || null,
      orgId: user.orgId,
      ownerId: user.id,
    },
  });
  return NextResponse.json(activity, { status: 201 });
}
