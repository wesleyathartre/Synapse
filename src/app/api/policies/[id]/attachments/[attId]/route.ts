import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

// GET /api/policies/[id]/attachments/[attId] — baixa o PDF
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; attId: string } },
) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const policy = await prisma.policy.findFirst({ where: { id: params.id, ...where } });
  if (!policy) return NextResponse.json({ error: 'Apólice não encontrada' }, { status: 404 });

  const att = await prisma.policyAttachment.findFirst({
    where: { id: params.attId, policyId: params.id },
  });
  if (!att) return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 });

  const body = new Uint8Array(att.data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': att.mimeType || 'application/pdf',
      'Content-Length': String(att.size || body.byteLength),
      'Content-Disposition': `inline; filename="${encodeURIComponent(att.filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

// DELETE /api/policies/[id]/attachments/[attId] — remove o anexo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; attId: string } },
) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const policy = await prisma.policy.findFirst({ where: { id: params.id, ...where } });
  if (!policy) return NextResponse.json({ error: 'Apólice não encontrada' }, { status: 404 });

  const att = await prisma.policyAttachment.findFirst({
    where: { id: params.attId, policyId: params.id },
    select: { id: true },
  });
  if (!att) return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 });

  await prisma.policyAttachment.delete({ where: { id: att.id } });
  return NextResponse.json({ ok: true });
}
