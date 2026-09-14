/**
 * Envio de e-mail transacional (Resend).
 * ─────────────────────────────────────────────────────────────────────────────
 * Funciona em modo "no-op" enquanto RESEND_API_KEY não estiver configurada:
 * nesse caso apenas loga no console e não quebra o fluxo. Assim o código já fica
 * pronto e é só adicionar a chave no ambiente (Vercel) para começar a enviar.
 *
 * Env vars:
 *   RESEND_API_KEY  — chave da API do Resend (https://resend.com). Sem ela = no-op.
 *   NOTIFY_FROM     — remetente verificado. Default: 'Synapse CRM <onboarding@resend.dev>'.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM || 'Synapse CRM <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[email:no-op] Para: ${to} | Assunto: ${subject} (defina RESEND_API_KEY para enviar de verdade)`);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text: text || undefined }),
    });
    if (!res.ok) {
      console.error('[email] Falha ao enviar:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Erro de rede ao enviar:', err);
    return false;
  }
}

/**
 * Notifica o corretor responsável sobre um lead qualificado (handoff do SDR).
 * Best-effort: nunca lança exceção para não travar a resposta ao visitante.
 */
export async function notifyLeadHandoff(params: {
  to: string;
  leadName: string;
  classification: string;
  score: number;
  phone: string;
  email?: string;
  summary: string;
  channel: string;
}): Promise<void> {
  const { to, leadName, classification, score, phone, email, summary, channel } = params;

  const heat =
    classification === 'QUENTE' ? '🔥 QUENTE'
    : classification === 'MORNO' ? '🌤️ MORNO'
    : '❄️ FRIO';

  const subject = `${heat} — Novo lead qualificado: ${leadName} (Score ${score})`;
  const summaryHtml = summary.replace(/\n/g, '<br>');
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 4px">${heat} — Lead qualificado pelo SDR</h2>
      <p style="color:#64748b;margin:0 0 16px">Canal: ${channel} · Score: <b>${score}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b">Nome</td><td style="padding:6px 0"><b>${leadName}</b></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Telefone</td><td style="padding:6px 0"><b>${phone}</b></td></tr>
        ${email ? `<tr><td style="padding:6px 0;color:#64748b">E-mail</td><td style="padding:6px 0">${email}</td></tr>` : ''}
      </table>
      <div style="margin-top:16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;white-space:pre-wrap">${summaryHtml}</div>
      <p style="color:#94a3b8;font-size:12px;margin-top:20px">Enviado automaticamente pelo Synapse CRM.</p>
    </div>`;

  try {
    await sendEmail({ to, subject, html, text: summary });
  } catch (err) {
    console.error('[email] notifyLeadHandoff falhou:', err);
  }
}
