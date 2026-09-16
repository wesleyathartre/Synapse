/**
 * GET /api/cron/policies
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron diário: atualiza status das apólices e dispara notificações de renovação.
 *
 * Regras:
 *  - ATIVA   → A_VENCER  quando endDate ≤ 30 dias a partir de hoje
 *  - ATIVA / A_VENCER → VENCIDA quando endDate < hoje
 *
 * Para cada apólice que ENTROU em A_VENCER nesta execução:
 *  - Envia e-mail ao corretor responsável
 *  - Cria tarefa automática: "Renovar apólice XXXX"
 *
 * Proteção: header Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem secret configurado = ambiente dev
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

function computeStatus(endDate: Date): 'ATIVA' | 'A_VENCER' | 'VENCIDA' {
  const now = new Date();
  const days = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'VENCIDA';
  if (days <= 30) return 'A_VENCER';
  return 'ATIVA';
}

function daysUntil(endDate: Date): number {
  return Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR');
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);

  // Busca apólices que NÃO estão canceladas ou já renovadas
  const policies = await prisma.policy.findMany({
    where: { status: { in: ['ATIVA', 'A_VENCER'] } },
    select: {
      id: true,
      number: true,
      product: true,
      insurer: true,
      clientName: true,
      premium: true,
      endDate: true,
      status: true,
      orgId: true,
      ownerId: true,
      owner: { select: { email: true, name: true, notifyEmail: true } },
    },
  });

  let markedVencida = 0;
  let markedAVencer = 0;
  let emailsSent = 0;
  let tasksCreated = 0;
  const errors: string[] = [];

  for (const policy of policies) {
    const newStatus = computeStatus(policy.endDate);

    if (newStatus === policy.status) continue; // sem mudança

    try {
      await prisma.policy.update({
        where: { id: policy.id },
        data: { status: newStatus },
      });

      if (newStatus === 'VENCIDA') {
        markedVencida++;
      }

      // Apólice ENTROU em A_VENCER agora → notifica e cria tarefa
      if (newStatus === 'A_VENCER') {
        markedAVencer++;
        const days = daysUntil(policy.endDate);

        // Cria tarefa de renovação (evita duplicata)
        const existingTask = await prisma.activity.findFirst({
          where: {
            ownerId: policy.ownerId,
            title: { contains: policy.number },
            done: false,
          },
        });

        if (!existingTask) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7); // tarefa para daqui 7 dias

          await prisma.activity.create({
            data: {
              type: 'TAREFA',
              title: `🔄 Renovar apólice ${policy.number} — ${policy.clientName}`,
              description: `Apólice vence em ${days} dias (${formatDate(policy.endDate)}). Seguradora: ${policy.insurer}. Prêmio: R$ ${policy.premium.toFixed(2)}.`,
              dueDate,
              orgId: policy.orgId,
              ownerId: policy.ownerId,
              done: false,
            },
          });
          tasksCreated++;
        }

        // Envia e-mail de renovação
        const toEmail = policy.owner.notifyEmail || policy.owner.email;
        const sent = await sendEmail({
          to: toEmail,
          subject: `⚠️ Apólice a vencer em ${days} dias — ${policy.clientName}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
              <h2 style="margin:0 0 4px">⚠️ Apólice próxima do vencimento</h2>
              <p style="color:#64748b;margin:0 0 20px">Olá, ${policy.owner.name}. Uma apólice da sua carteira precisa de atenção.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:8px;padding:16px">
                <tr><td style="padding:6px 12px;color:#64748b">Apólice</td><td style="padding:6px 12px;font-weight:bold">${policy.number}</td></tr>
                <tr><td style="padding:6px 12px;color:#64748b">Cliente</td><td style="padding:6px 12px;font-weight:bold">${policy.clientName}</td></tr>
                <tr><td style="padding:6px 12px;color:#64748b">Produto</td><td style="padding:6px 12px">${policy.product}</td></tr>
                <tr><td style="padding:6px 12px;color:#64748b">Seguradora</td><td style="padding:6px 12px">${policy.insurer}</td></tr>
                <tr><td style="padding:6px 12px;color:#64748b">Vencimento</td><td style="padding:6px 12px;color:#dc2626;font-weight:bold">${formatDate(policy.endDate)} (${days} dias)</td></tr>
                <tr><td style="padding:6px 12px;color:#64748b">Prêmio</td><td style="padding:6px 12px">R$ ${policy.premium.toFixed(2)}</td></tr>
              </table>
              <p style="margin-top:20px">Uma tarefa de renovação foi criada automaticamente no seu Synapse CRM.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:20px">Enviado automaticamente pelo Synapse CRM.</p>
            </div>`,
        });
        if (sent) emailsSent++;
      }
    } catch (err: any) {
      errors.push(`${policy.number}: ${err?.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: policies.length,
    markedVencida,
    markedAVencer,
    tasksCreated,
    emailsSent,
    errors,
    runAt: now.toISOString(),
  });
}
