/**
 * GET /api/cron/notify-boletos
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron semanal: envia e-mail ao corretor com resumo dos boletos a vencer
 * nos próximos 7 dias.
 *
 * Respeita as preferências de notificação do usuário:
 *  - notifyBoletos: boolean — se false, não envia
 *  - notifyEmail: string?   — e-mail alternativo (null = usa o e-mail principal)
 *  - notifyDayOfWeek: int   — dia da semana configurado (0=Dom...6=Sáb)
 *    → O cron pode rodar todos os dias, mas só envia para quem configurou
 *      o dia de hoje como dia de notificação.
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
  if (!secret) return true;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatMoney(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();
  const todayDow = now.getDay(); // 0=Dom ... 6=Sáb

  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  // Busca usuários ativos com notificação habilitada para hoje
  const users = await prisma.user.findMany({
    where: {
      active: true,
      notifyBoletos: true,
      notifyDayOfWeek: todayDow,
    },
    select: {
      id: true,
      name: true,
      email: true,
      notifyEmail: true,
    },
  });

  let emailsSent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Boletos pendentes vencendo nos próximos 7 dias
      const boletos = await prisma.boleto.findMany({
        where: {
          ownerId: user.id,
          status: 'PENDENTE',
          dueDate: { gte: now, lte: in7 },
        },
        orderBy: { dueDate: 'asc' },
        select: {
          clientName: true,
          description: true,
          amount: true,
          dueDate: true,
        },
      });

      // Boletos já vencidos (em atraso)
      const overdue = await prisma.boleto.findMany({
        where: {
          ownerId: user.id,
          status: 'VENCIDO',
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: {
          clientName: true,
          description: true,
          amount: true,
          dueDate: true,
        },
      });

      if (boletos.length === 0 && overdue.length === 0) {
        skipped++;
        continue;
      }

      const totalAVencer = boletos.reduce((s, b) => s + b.amount, 0);
      const totalVencido = overdue.reduce((s, b) => s + b.amount, 0);

      const boletoRows = boletos
        .map(
          (b) => `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${b.clientName}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${b.description}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-weight:bold">${formatDate(b.dueDate)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#0f172a">${formatMoney(b.amount)}</td>
          </tr>`,
        )
        .join('');

      const overdueRows = overdue
        .map(
          (b) => `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #fef2f2">${b.clientName}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #fef2f2;font-size:12px;color:#64748b">${b.description}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #fef2f2;font-weight:bold;color:#dc2626">${formatDate(b.dueDate)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #fef2f2;font-weight:bold;color:#dc2626">${formatMoney(b.amount)}</td>
          </tr>`,
        )
        .join('');

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
          <h2 style="margin:0 0 4px">📋 Resumo semanal de boletos</h2>
          <p style="color:#64748b;margin:0 0 24px">Olá, ${user.name}. Aqui está o resumo dos boletos da sua carteira.</p>

          ${
            boletos.length > 0
              ? `
          <h3 style="margin:0 0 8px;color:#ca8a04">⏰ Vencendo nos próximos 7 dias — ${formatMoney(totalAVencer)}</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;background:#fffbeb;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#fef3c7;color:#92400e;font-size:11px;text-transform:uppercase">
                <th style="padding:8px 12px;text-align:left">Cliente</th>
                <th style="padding:8px 12px;text-align:left">Descrição</th>
                <th style="padding:8px 12px;text-align:left">Vencimento</th>
                <th style="padding:8px 12px;text-align:left">Valor</th>
              </tr>
            </thead>
            <tbody>${boletoRows}</tbody>
          </table>`
              : ''
          }

          ${
            overdue.length > 0
              ? `
          <h3 style="margin:0 0 8px;color:#dc2626">🚨 Em atraso — ${formatMoney(totalVencido)}</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;background:#fef2f2;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#fee2e2;color:#991b1b;font-size:11px;text-transform:uppercase">
                <th style="padding:8px 12px;text-align:left">Cliente</th>
                <th style="padding:8px 12px;text-align:left">Descrição</th>
                <th style="padding:8px 12px;text-align:left">Vencimento</th>
                <th style="padding:8px 12px;text-align:left">Valor</th>
              </tr>
            </thead>
            <tbody>${overdueRows}</tbody>
          </table>`
              : ''
          }

          <p style="color:#94a3b8;font-size:12px;margin-top:20px">
            Enviado automaticamente pelo Synapse CRM.<br>
            Para ajustar suas preferências de notificação, acesse a tela de Conta.
          </p>
        </div>`;

      const toEmail = user.notifyEmail || user.email;
      const sent = await sendEmail({
        to: toEmail,
        subject: `📋 Boletos da semana — ${boletos.length} a vencer · ${overdue.length} em atraso`,
        html,
      });

      if (sent) emailsSent++;
    } catch (err: any) {
      errors.push(`${user.email}: ${err?.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: users.length,
    emailsSent,
    skipped,
    errors,
    runAt: now.toISOString(),
  });
}
