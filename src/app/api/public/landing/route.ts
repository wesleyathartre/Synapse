import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { corsHeaders } from '@/lib/cors';

// Endpoint PÚBLICO (sem login) que a Landing Page consome para se configurar.
// Retorna o conteúdo editável definido pelo cliente no CRM (ex.: campanha).

const DEFAULTS = {
  campaign: { enabled: false, text: '', link: '#simulador' },
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);

  const cfg = await prisma.landingConfig.findUnique({ where: { id: 'default' } }).catch(() => null);

  const data = cfg
    ? {
        campaign: {
          enabled: cfg.campaignEnabled,
          text: cfg.campaignText,
          link: cfg.campaignLink || '#simulador',
        },
      }
    : DEFAULTS;

  return NextResponse.json(data, { headers });
}
