/**
 * Camada de LLM — abstrai o provedor (Groq, OpenAI ou Anthropic).
 * ─────────────────────────────────────────────────────────────────────────────
 * Detecta automaticamente qual chave está configurada no ambiente:
 *   ANTHROPIC_API_KEY  → usa Claude (modelo em ANTHROPIC_MODEL, default haiku)
 *   OPENAI_API_KEY     → usa GPT   (modelo em OPENAI_MODEL, default gpt-4o-mini)
 *   GROQ_API_KEY       → usa Groq (GRATUITO, compatível com OpenAI;
 *                        modelo em GROQ_MODEL, default openai/gpt-oss-20b)
 * Se NENHUMA chave existir, retorna null → o chamador cai no modo determinístico.
 */

export interface LlmResult {
  text: string;
  provider: 'anthropic' | 'openai' | 'groq';
}

export function llmConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
}

// Formato OpenAI-compatível (usado por OpenAI e Groq).
async function chatOpenAiCompat(
  provider: 'openai' | 'groq',
  url: string,
  key: string,
  model: string,
  system: string,
  user: string,
): Promise<LlmResult | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
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
      console.error(`[llm:${provider}] falha`, res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ? { text, provider } : null;
  } catch (err) {
    console.error(`[llm:${provider}] erro de rede`, err);
    return null;
  }
}

async function chatAnthropic(key: string, system: string, user: string): Promise<LlmResult | null> {
  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
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
  } catch (err) {
    console.error('[llm:anthropic] erro de rede', err);
    return null;
  }
}

// Tenta os provedores configurados em ordem; se um falhar, cai no próximo.
export async function chat(system: string, user: string): Promise<LlmResult | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (anthropicKey) {
    const r = await chatAnthropic(anthropicKey, system, user);
    if (r) return r;
  }
  if (openaiKey) {
    const r = await chatOpenAiCompat(
      'openai',
      'https://api.openai.com/v1/chat/completions',
      openaiKey,
      process.env.OPENAI_MODEL || 'gpt-4o-mini',
      system,
      user,
    );
    if (r) return r;
  }
  if (groqKey) {
    const r = await chatOpenAiCompat(
      'groq',
      'https://api.groq.com/openai/v1/chat/completions',
      groqKey,
      process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      system,
      user,
    );
    if (r) return r;
  }
  return null;
}
