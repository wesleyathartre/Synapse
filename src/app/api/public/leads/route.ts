import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp, getUserAgent, audit } from '@/lib/audit';
import { corsHeaders } from '@/lib/cors';

// Endpoint PÚBLICO (sem login) para a Landing Page criar leads no CRM.
// Protegido por rate limit + honeypot. A origem é gravada como "SITE".

// Produtos de interesse aceitos (evita lixo no campo interest).
const INTERESTS = new Set([
  'AUTO', 'MOTO', 'CAMINHAO', 'NAUTICO', 'RESIDENCIAL', 'CONDOMINIO', 'EMPRESARIAL', 'RURAL',
  'EQUIPAMENTOS', 'VIDA', 'VIDA_GRUPO', 'ACIDENTES', 'SAUDE', 'ODONTO', 'CELULAR', 'PORTATEIS',
  'BIKE', 'PET', 'VIAGEM', 'GARANTIA_ESTENDIDA', 'FIANCA', 'RESP_CIVIL', 'PREVIDENCIA',
  'CAPITALIZACAO', 'INVESTIMENTO', 'CONSORCIO_IMOVEL', 'CONSORCIO_AUTO', 'CONSORCIO_MOTO',
  'CONSORCIO_PESADOS', 'CONSORCIO_SERVICOS',
]);

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const ip = getClientIp(req);

  const rl = rateLimit(`public-lead:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitas solicitações. Tente novamente em instantes.' },
      { status: 429, headers },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // Honeypot: campo invisível preenchido = bot. Finge sucesso e ignora.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 200, headers });
  }

  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = body.email ? String(body.email).trim() : null;
  if (!name || !phone) {
    return NextResponse.json(
      { error: 'Nome e telefone são obrigatórios.' },
      { status: 400, headers },
    );
  }

  const rawInterest = String(body.interest || 'AUTO').toUpperCase();
  const interest = INTERESTS.has(rawInterest) ? rawInterest : 'AUTO';

  // Dono padrão: primeiro ADMIN ativo (fallback: primeiro usuário ativo).
  const owner =
    (await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, orderBy: { createdAt: 'asc' } })) ||
    (await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }));
  if (!owner) {
    return NextResponse.json(
      { error: 'Nenhum destinatário configurado.' },
      { status: 503, headers },
    );
  }

  const notesParts: string[] = ['Origem: Landing Page'];
  if (body.interestLabel) notesParts.push(`Interesse: ${String(body.interestLabel).trim()}`);
  if (body.message) notesParts.push(String(body.message).trim());

  const lead = await prisma.lead.create({
    data: {
      name: name.slice(0, 120),
      email: email ? email.slice(0, 160) : null,
      phone: phone.slice(0, 30),
      source: 'SITE',
      interest,
      status: 'NOVO',
      temp: 'MORNO',
      notes: notesParts.join(' · ').slice(0, 500),
      orgId: owner.orgId,
      ownerId: owner.id,
    },
  });

  await audit({
    action: 'LEAD_LANDING',
    userId: owner.id,
    ip,
    userAgent: getUserAgent(req),
    meta: { leadId: lead.id, interest },
  });

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201, headers });
}
