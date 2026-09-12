import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.done !== undefined) {
    data.done = !!body.done;
    data.doneAt = body.done ? new Date() : null;
  }
  const activity = await prisma.activity.update({ where: { id: params.id }, data });
  return NextResponse.json(activity);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const activity = await prisma.activity.update({
    where: { id: params.id },
    data: {
      type: body.type,
      title: body.title,
      description: body.description ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
  });
  return NextResponse.json(activity);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  await prisma.activity.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
