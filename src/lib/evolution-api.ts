/**
 * Evolution API Client — Synapse SDR
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerencia a comunicação com a Evolution API (WhatsApp Web / QR Code).
 * Suporta simulação de digitação (presence/composing delay) para evitar
 * detecção de bots e humanizar o atendimento.
 */

export interface SendTextMessageOptions {
  to: string;            // Número de telefone (ex: '5511999999999' ou com '@s.whatsapp.net')
  text: string;          // Conteúdo da mensagem
  delayMs?: number;      // Tempo simulando digitação antes do envio (padrão: 1500ms)
}

export interface InstanceStatusResponse {
  instance?: {
    instanceName?: string;
    state?: 'open' | 'close' | 'connecting';
  };
  status?: string;
}

/**
 * Remove sufixos como '@s.whatsapp.net' e caracteres não numéricos
 */
export function sanitizeWhatsAppNumber(phone: string): string {
  const clean = phone.replace('@s.whatsapp.net', '').replace('@g.us', '');
  return clean.replace(/\D/g, '');
}

/**
 * Envia uma mensagem de texto via Evolution API
 */
export async function sendEvolutionTextMessage({
  to,
  text,
  delayMs = 1500,
}: SendTextMessageOptions): Promise<{ success: boolean; error?: string }> {
  const apiUrl   = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
  const apiKey   = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'synapse';

  const recipient = sanitizeWhatsAppNumber(to);

  // Modo desenvolvimento / sem credenciais configuradas: apenas registra em log
  if (!apiUrl || !apiKey) {
    console.log(`[Evolution API (Modo Dev) → ${recipient}] (delay: ${delayMs}ms):`, text);
    return { success: true };
  }

  try {
    const endpoint = `${apiUrl}/message/sendText/${instance}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: recipient,
        text,
        delay: delayMs,
        linkPreview: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Evolution API Error ${response.status}]`, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Evolution API Exception]', err);
    return { success: false, error: err?.message || 'Erro de conexão com a Evolution API' };
  }
}

/**
 * Consulta o estado da conexão da instância na Evolution API
 */
export async function getEvolutionInstanceStatus(): Promise<InstanceStatusResponse | null> {
  const apiUrl   = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
  const apiKey   = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'synapse';

  if (!apiUrl || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as InstanceStatusResponse;
  } catch (err) {
    console.error('[Evolution API getStatus Exception]', err);
    return null;
  }
}
