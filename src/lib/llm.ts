/**
 * Camada de LLM — abstrai o provedor (OpenAI ou Anthropic).
 * ─────────────────────────────────────────────────────────────────────────────
 * Detecta automaticamente qual chave está configurada no ambiente:
 *   ANTHROPIC_API_KEY  → usa Claude (modelo em ANTHROPIC_MODEL, default haiku)
 *   OPENAI_API_KEY     → usa GPT   (modelo em OPENAI_MODEL, default gpt-4o-mini)
 * Se NENHUMA chave existir, retorna null → o chamador cai no modo determinístico.
 */

export interface LlmResult {
  text: string;
  provider: 'anthropic' | 'openai';
}

export function llmConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export async function chat(system: string, user: string): Promise<LlmResult | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    if (anthropicKey) {
      const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          temperature: 0.2,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) {
        console.error('[llm:anthropic] falha', res.status, await res.text().catch(() => ''));
        return null;
      }
      const data = await res.json();
      const text = data?.content?.[0]?.text?.trim();
      return text ? { text, provider: 'anthropic' } : null;
    }

    if (openaiKey) {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) {
        console.error('[llm:openai] falha', res.status, await res.text().catch(() => ''));
        return null;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      return text ? { text, provider: 'openai' } : null;
    }
  } catch (err) {
    console.error('[llm] erro de rede', err);
    return null;
  }

  return null;
}
