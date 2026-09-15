import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownerScope } from '@/lib/scope';

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ['application/pdf'];

// GET /api/policies/[id]/attachments — lista os anexos (metadados, sem o binário)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const policy = await prisma.policy.findFirst({ where: { id: params.id, ...where } });
  if (!policy) return NextResponse.json({ error: 'Apólice não encontrada' }, { status: 404 });

  const attachments = await prisma.policyAttachment.findMany({
    where: { policyId: params.id },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ data: attachments });
}

// POST /api/policies/[id]/attachments — envia um PDF (multipart form-data, campo "file")
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, where } = await ownerScope();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const policy = await prisma.policy.findFirst({ where: { id: params.id, ...where } });
  if (!policy) return NextResponse.json({ error: 'Apólice não encontrada' }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Envie um arquivo PDF.' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Somente arquivos PDF são aceitos.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'O arquivo deve ter até 8 MB.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const created = await prisma.policyAttachment.create({
    data: {
      policyId: params.id,
      ownerId: policy.ownerId,
      filename: (file.name || 'apolice.pdf').slice(0, 200),
      mimeType: file.type,
      size: file.size,
      data: bytes,
    },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
