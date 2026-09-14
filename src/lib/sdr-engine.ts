/**
 * Synapse SDR — Engine de Pré-Atendimento (Fase 2)
 * ──────────────────────────────────────────────────
 * Máquina de estados para qualificação de leads via WhatsApp.
 * Integração com Meta Cloud API — configurada na Fase 2.
 *
 * Estados possíveis:
 *  GREETING → IDENTIFY_INTENTION → CAPTURE_INTEREST → CAPTURE_NEED
 *           → CAPTURE_DEADLINE → CAPTURE_CONTACT → SCORING → HANDOFF → CLOSED
 *
 * Em qualquer estado: palavras-chave de transferência → vai direto para HANDOFF.
 */

export type SdrState =
  | 'GREETING'
  | 'IDENTIFY_INTENTION'
  | 'CAPTURE_INTEREST'
  | 'CAPTURE_NEED'
  | 'CAPTURE_DEADLINE'
  | 'CAPTURE_CONTACT'
  | 'SCORING'
  | 'HANDOFF'
  | 'CLOSED';

export type SdrMessage = {
  role: 'bot' | 'user';
  content: string;
  timestamp: string;
};

export type SdrContext = {
  intention?: string;   // ORCAMENTO | CONHECER | AGENDAR | JA_CLIENTE | HUMANO
  interest?: string;
  need?: string;
  deadline?: string;    // IMEDIATO | ATE_30_DIAS | PESQUISANDO | SEM_PREVISAO
  name?: string;
  city?: string;
  phone?: string;       // capturado no canal WEB (no WhatsApp já vem do número)
  email?: string;       // opcional, capturado no canal WEB
  isDecisionMaker?: string;
  score: number;
  classification?: string; // QUENTE | MORNO | FRIO | NAO_QUALIFICADO
};

// Palavras que disparam transferência imediata para humano
const HANDOFF_TRIGGERS = [
  'atendente', 'humano', 'pessoa', 'falar com alguém', 'falar com alguem',
  'quero falar', 'preciso falar', 'me conecta', 'me conecte',
];

// Respostas padrão (configuráveis via SdrConfig no banco)
export const DEFAULT_MESSAGES: Record<SdrState, string> = {
  GREETING:
    'Olá! 👋 Sou o assistente virtual da corretora. Posso fazer algumas perguntas rápidas para direcionar seu atendimento?\n\n_Se preferir, digite *atendente* para falar com uma pessoa._',
  IDENTIFY_INTENTION:
    'Como posso ajudar você hoje?\n\n1️⃣ Conhecer serviços/produtos\n2️⃣ Solicitar orçamento\n3️⃣ Agendar atendimento\n4️⃣ Já sou cliente\n5️⃣ Falar com uma pessoa\n\n_Digite o número da opção._',
  CAPTURE_INTEREST:
    'Perfeito! Qual serviço ou produto você procura?\n_(Ex: seguro auto, plano de saúde, consórcio...)_',
  CAPTURE_NEED:
    'Pode me explicar brevemente o que você precisa ou qual desafio quer resolver?',
  CAPTURE_DEADLINE:
    'Para quando você pretende iniciar ou contratar?\n\n1️⃣ O quanto antes\n2️⃣ Nos próximos 30 dias\n3️⃣ Estou pesquisando opções\n4️⃣ Ainda não tenho previsão\n\n_Digite o número._',
  CAPTURE_CONTACT:
    'Para direcionar corretamente, me informe por favor seu *nome* e *cidade/região*.',
  SCORING:
    '✅ Obrigado pelas informações! Estou organizando tudo para o seu atendimento...',
  HANDOFF:
    '🙏 Obrigado! Estou encaminhando você para nossa equipe, que retornará em breve.\n\n📋 Suas informações foram registradas e o atendente já terá o contexto completo.',
  CLOSED:
    'Atendimento encerrado. Qualquer coisa, é só nos chamar! 😊',
};

// Verifica se o texto contém gatilho de transferência
export function isHandoffTrigger(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return HANDOFF_TRIGGERS.some((t) => lower.includes(t));
}

// Calcula o score baseado no contexto coletado
export function calculateScore(ctx: SdrContext): { score: number; classification: string } {
  let score = 0;

  if (ctx.intention === 'ORCAMENTO')      score += 30;
  if (ctx.intention === 'AGENDAR')        score += 20;
  if (ctx.intention === 'CONHECER')       score += 5;
  if (ctx.intention === 'HUMANO')         score += 15;

  if (ctx.deadline === 'IMEDIATO')        score += 25;
  if (ctx.deadline === 'ATE_30_DIAS')     score += 15;
  if (ctx.deadline === 'PESQUISANDO')     score -= 10;

  if (ctx.need && ctx.need.length > 20)   score += 15; // descreveu necessidade
  if (ctx.name)                           score += 5;
  if (ctx.city)                           score += 10;

  score = Math.max(0, Math.min(100, score));

  const classification =
    score >= 60 ? 'QUENTE' :
    score >= 30 ? 'MORNO' :
    'FRIO';

  return { score, classification };
}

// Interpreta a resposta do usuário e avança o estado
export function processUserMessage(
  state: SdrState,
  text: string,
  ctx: SdrContext,
): { nextState: SdrState; updatedCtx: SdrContext; botMessage: string } {
  const t = text.trim();

  // Gatilho de transferência em qualquer estado
  if (isHandoffTrigger(t)) {
    const { score, classification } = calculateScore(ctx);
    return {
      nextState: 'HANDOFF',
      updatedCtx: { ...ctx, score, classification },
      botMessage: DEFAULT_MESSAGES.HANDOFF,
    };
  }

  switch (state) {
    case 'GREETING': {
      return {
        nextState: 'IDENTIFY_INTENTION',
        updatedCtx: ctx,
        botMessage: DEFAULT_MESSAGES.IDENTIFY_INTENTION,
      };
    }

    case 'IDENTIFY_INTENTION': {
      const intentionMap: Record<string, string> = {
        '1': 'CONHECER',
        '2': 'ORCAMENTO',
        '3': 'AGENDAR',
        '4': 'JA_CLIENTE',
        '5': 'HUMANO',
      };
      const intention = intentionMap[t] || 'CONHECER';
      if (t === '5') {
        const { score, classification } = calculateScore({ ...ctx, intention: 'HUMANO' });
        return {
          nextState: 'HANDOFF',
          updatedCtx: { ...ctx, intention: 'HUMANO', score, classification },
          botMessage: DEFAULT_MESSAGES.HANDOFF,
        };
      }
      return {
        nextState: 'CAPTURE_INTEREST',
        updatedCtx: { ...ctx, intention },
        botMessage: DEFAULT_MESSAGES.CAPTURE_INTEREST,
      };
    }

    case 'CAPTURE_INTEREST': {
      return {
        nextState: 'CAPTURE_NEED',
        updatedCtx: { ...ctx, interest: t },
        botMessage: DEFAULT_MESSAGES.CAPTURE_NEED,
      };
    }

    case 'CAPTURE_NEED': {
      return {
        nextState: 'CAPTURE_DEADLINE',
        updatedCtx: { ...ctx, need: t },
        botMessage: DEFAULT_MESSAGES.CAPTURE_DEADLINE,
      };
    }

    case 'CAPTURE_DEADLINE': {
      const deadlineMap: Record<string, string> = {
        '1': 'IMEDIATO',
        '2': 'ATE_30_DIAS',
        '3': 'PESQUISANDO',
        '4': 'SEM_PREVISAO',
      };
      const deadline = deadlineMap[t] || 'SEM_PREVISAO';
      return {
        nextState: 'CAPTURE_CONTACT',
        updatedCtx: { ...ctx, deadline },
        botMessage: DEFAULT_MESSAGES.CAPTURE_CONTACT,
      };
    }

    case 'CAPTURE_CONTACT': {
      // Extrai nome e cidade do texto livre (ex: "João Silva, São Paulo")
      const parts = t.split(/[,\/\-]/);
      const name  = parts[0]?.trim() || t;
      const city  = parts[1]?.trim() || undefined;
      const updatedCtx = { ...ctx, name, city };
      const { score, classification } = calculateScore(updatedCtx);
      return {
        nextState: 'HANDOFF',
        updatedCtx: { ...updatedCtx, score, classification },
        botMessage: DEFAULT_MESSAGES.HANDOFF,
      };
    }

    default: {
      return {
        nextState: state,
        updatedCtx: ctx,
        botMessage: 'Desculpe, não entendi. Pode repetir?',
      };
    }
  }
}

// Gera o resumo do handoff para ser exibido ao corretor
export function generateHandoffSummary(ctx: SdrContext, phone: string): string {
  const intentionLabels: Record<string, string> = {
    ORCAMENTO: 'Solicitar orçamento',
    CONHECER:  'Conhecer serviços',
    AGENDAR:   'Agendar atendimento',
    JA_CLIENTE: 'Já é cliente',
    HUMANO:    'Pediu atendimento humano',
  };
  const deadlineLabels: Record<string, string> = {
    IMEDIATO:    'O quanto antes',
    ATE_30_DIAS: 'Até 30 dias',
    PESQUISANDO: 'Pesquisando opções',
    SEM_PREVISAO: 'Sem previsão',
  };
  const classIcon: Record<string, string> = {
    QUENTE: '🔴', MORNO: '🟡', FRIO: '🔵', NAO_QUALIFICADO: '⛔',
  };

  return [
    `${classIcon[ctx.classification || 'FRIO'] || '⚪'} *Novo lead qualificado via SDR*`,
    ``,
    `👤 Nome: ${ctx.name || 'Não informado'}`,
    `📱 WhatsApp: ${phone}`,
    `🏙️ Cidade: ${ctx.city || 'Não informada'}`,
    `🎯 Intenção: ${intentionLabels[ctx.intention || ''] || ctx.intention || '—'}`,
    `🛡️ Interesse: ${ctx.interest || 'Não informado'}`,
    `📋 Necessidade: ${ctx.need || 'Não informada'}`,
    `⏱️ Prazo: ${deadlineLabels[ctx.deadline || ''] || '—'}`,
    `🔢 Score: ${ctx.score} — ${ctx.classification || '—'}`,
    ``,
    `Histórico completo disponível no Synapse CRM.`,
  ].join('\n');
}
