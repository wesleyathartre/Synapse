import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { audit, getClientIp, getUserAgent } from '@/lib/audit';

// GET /api/admin/landing — lê a configuração da Landing (somente ADMIN)
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const cfg = await prisma.landingConfig.findUnique({ where: { id: 'default' } });

  return NextResponse.json({
    config: {
      campaignEnabled: cfg?.campaignEnabled ?? false,
      campaignText: cfg?.campaignText ?? '',
      campaignLink: cfg?.campaignLink ?? '#simulador',
    },
  });
}

// PUT /api/admin/landing — salva a configuração da Landing (somente ADMIN)
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const campaignEnabled = Boolean(body.campaignEnabled);
  const campaignText = String(body.campaignText ?? '').trim().slice(0, 160);
  const campaignLink = String(body.campaignLink ?? '#simulador').trim().slice(0, 200) || '#simulador';

  if (campaignEnabled && !campaignText) {
    return NextResponse.json(
      { error: 'Escreva o texto da campanha para ativá-la.' },
      { status: 400 },
    );
  }

  const data = { campaignEnabled, campaignText, campaignLink };
  const cfg = await prisma.landingConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  });

  await audit({
    action: 'ADMIN_UPDATE_LANDING',
    userId: guard.session.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta: { campaignEnabled },
  });

  return NextResponse.json({
    config: {
      campaignEnabled: cfg.campaignEnabled,
      campaignText: cfg.campaignText,
      campaignLink: cfg.campaignLink,
    },
  });
}
