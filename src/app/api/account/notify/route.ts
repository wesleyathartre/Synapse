import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

// ── GET /api/account/notify ───────────────────────────────────────────────────
export async function GET() {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notifyBoletos: true, notifyDayOfWeek: true, notifyEmail: true },
  });

  return NextResponse.json(u);
}

// ── PATCH /api/account/notify ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { user } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      notifyBoletos:   typeof body.notifyBoletos   === 'boolean' ? body.notifyBoletos   : undefined,
      notifyDayOfWeek: typeof body.notifyDayOfWeek === 'number'  ? body.notifyDayOfWeek : undefined,
      notifyEmail:     body.notifyEmail !== undefined             ? body.notifyEmail || null : undefined,
    },
    select: { notifyBoletos: true, notifyDayOfWeek: true, notifyEmail: true },
  });

  return NextResponse.json(updated);
}
