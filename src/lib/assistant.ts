/**
 * Assistente do Synapse CRM — responde perguntas consultando dados REAIS do banco.
 * ─────────────────────────────────────────────────────────────────────────────
 * A IA nunca "inventa": recebe apenas um pacote de dados já consultado (escopo do
 * usuário) e é instruída a responder somente com base nele. Se não houver chave de
 * LLM configurada, cai num resumo determinístico (os números continuam reais).
 *
 * LGPD: o contexto NÃO inclui CPF/CNPJ, data de nascimento nem endereço.
 */

import { prisma } from '@/lib/prisma';
import { chat, llmConfigured } from '@/lib/llm';

type Scope = { ownerId?: string };

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

interface Context {
  text: string;        // pacote de dados para a IA
  overview: string;    // resumo determinístico (fallback sem IA)
}

export async function buildContext(where: Scope): Promise<Context> {
  const now = new Date();
  const in7 = daysFromNow(7);
  const in30 = daysFromNow(30);

  const [
    leadsTotal,
    leadsByStatus,
    leadsByTemp,
    hotLeads,
    clientsTotal,
    policiesActive,
    premiumAgg,
    expiringPolicies,
    boletosPendCount,
    boletosPendSum,
    overdueCount,
    overdueSum,
    dueThisWeek,
    dealsOpen,
    dealsByStage,
    dealsValueAgg,
    pendingTasks,
    overdueTasks,
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['temp'], where, _count: { _all: true } }),
    prisma.lead.findMany({
      where: { ...where, temp: 'QUENTE' },
      select: { name: true, phone: true, interest: true, sdrScore: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.client.count({ where }),
    prisma.policy.count({ where: { ...where, status: 'ATIVA' } }),
    prisma.policy.aggregate({ where: { ...where, status: 'ATIVA' }, _sum: { premium: true, commission: true } }),
    prisma.policy.findMany({
      where: { ...where, endDate: { lte: in30, gte: now }, status: { in: ['ATIVA', 'A_VENCER'] } },
      select: { number: true, clientName: true, product: true, endDate: true, premium: true },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
    prisma.boleto.count({ where: { ...where, status: 'PENDENTE' } }),
    prisma.boleto.aggregate({ where: { ...where, status: 'PENDENTE' }, _sum: { amount: true } }),
    prisma.boleto.count({ where: { ...where, status: { in: ['PENDENTE', 'VENCIDO'] }, dueDate: { lt: now } } }),
    prisma.boleto.aggregate({ where: { ...where, status: { in: ['PENDENTE', 'VENCIDO'] }, dueDate: { lt: now } }, _sum: { amount: true } }),
    prisma.boleto.findMany({
      where: { ...where, status: 'PENDENTE', dueDate: { gte: now, lte: in7 } },
      select: { clientName: true, description: true, amount: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 15,
    }),
    prisma.deal.count({ where: { ...where, status: 'OPEN' } }),
    prisma.deal.groupBy({ by: ['stage'], where: { ...where, status: 'OPEN' }, _count: { _all: true } }),
    prisma.deal.aggregate({ where: { ...where, status: 'OPEN' }, _sum: { value: true, premium: true, commission: true } }),
    prisma.activity.count({ where: { ...where, done: false } }),
    prisma.activity.count({ where: { ...where, done: false, dueDate: { lt: now } } }),
  ]);

  const fmtDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR');
  const byStatus = leadsByStatus.map((s) => `${s.status}: ${s._count._all}`).join(', ');
  const byTemp = leadsByTemp.map((s) => `${s.temp}: ${s._count._all}`).join(', ');
  const byStage = dealsByStage.map((s) => `${s.stage}: ${s._count._all}`).join(', ');

  const lines: string[] = [];
  lines.push(`DATA DE HOJE: ${fmtDate(now)}`);
  lines.push('');
  lines.push('== LEADS ==');
  lines.push(`Total de leads: ${leadsTotal}`);
  lines.push(`Por status: ${byStatus || '—'}`);
  lines.push(`Por temperatura: ${byTemp || '—'}`);
  if (hotLeads.length) {
    lines.push('Leads QUENTES (nome | interesse | score | status | telefone):');
    hotLeads.forEach((l) =>
      lines.push(`  - ${l.name} | ${l.interest} | score ${l.sdrScore ?? '—'} | ${l.status} | ${l.phone}`),
    );
  }
  lines.push('');
  lines.push('== CLIENTES & APÓLICES ==');
  lines.push(`Total de clientes: ${clientsTotal}`);
  lines.push(`Apólices ativas: ${policiesActive}`);
  lines.push(`Prêmio somado (ativas): ${brl(premiumAgg._sum.premium || 0)}`);
  lines.push(`Comissão somada (ativas): ${brl(premiumAgg._sum.commission || 0)}`);
  if (expiringPolicies.length) {
    lines.push('Apólices vencendo em até 30 dias (nº | cliente | produto | vencimento | prêmio):');
    expiringPolicies.forEach((p) =>
      lines.push(`  - ${p.number} | ${p.clientName} | ${p.product} | ${fmtDate(p.endDate)} | ${brl(p.premium)}`),
    );
  }
  lines.push('');
  lines.push('== BOLETOS ==');
  lines.push(`Pendentes: ${boletosPendCount} (${brl(boletosPendSum._sum.amount || 0)})`);
  lines.push(`Vencidos: ${overdueCount} (${brl(overdueSum._sum.amount || 0)})`);
  if (dueThisWeek.length) {
    lines.push('Vencendo nos próximos 7 dias (cliente | descrição | valor | vencimento):');
    dueThisWeek.forEach((b) =>
      lines.push(`  - ${b.clientName} | ${b.description} | ${brl(b.amount)} | ${fmtDate(b.dueDate)}`),
    );
  }
  lines.push('');
  lines.push('== FUNIL / OPORTUNIDADES ==');
  lines.push(`Oportunidades abertas: ${dealsOpen}`);
  lines.push(`Por etapa: ${byStage || '—'}`);
  lines.push(`Valor segurado em aberto: ${brl(dealsValueAgg._sum.value || 0)}`);
  lines.push(`Prêmio em aberto: ${brl(dealsValueAgg._sum.premium || 0)}`);
  lines.push(`Comissão potencial: ${brl(dealsValueAgg._sum.commission || 0)}`);
  lines.push('');
  lines.push('== TAREFAS ==');
  lines.push(`Pendentes: ${pendingTasks} (atrasadas: ${overdueTasks})`);

  const text = lines.join('\n');

  const overview = [
    `📊 Resumo da sua base (${fmtDate(now)}):`,
    `• ${leadsTotal} leads (${byTemp || '—'})`,
    `• ${clientsTotal} clientes · ${policiesActive} apólices ativas · prêmio ${brl(premiumAgg._sum.premium || 0)}`,
    `• Boletos: ${boletosPendCount} pendentes (${brl(boletosPendSum._sum.amount || 0)}), ${overdueCount} vencidos`,
    `• ${dueThisWeek.length} boleto(s) vencendo em 7 dias · ${expiringPolicies.length} apólice(s) a renovar em 30 dias`,
    `• Funil: ${dealsOpen} oportunidades abertas · comissão potencial ${brl(dealsValueAgg._sum.commission || 0)}`,
    `• Tarefas: ${pendingTasks} pendentes (${overdueTasks} atrasadas)`,
  ].join('\n');

  return { text, overview };
}

const SYSTEM_PROMPT = `Você é o assistente do Synapse CRM, um CRM para corretores de seguros.
Responda SEMPRE em português do Brasil, de forma direta e objetiva.
Regras invioláveis:
- Responda SOMENTE com base nos DADOS fornecidos abaixo. Não invente números, nomes ou datas.
- Se a informação pedida não estiver nos dados, diga claramente que não há essa informação na base.
- Use os valores exatos (moeda em R$) que aparecem nos dados.
- Seja conciso: use frases curtas ou bullets. Não repita todos os dados, responda o que foi perguntado.`;

export interface AssistantAnswer {
  answer: string;
  usedAI: boolean;
}

export async function answerQuestion(question: string, where: Scope): Promise<AssistantAnswer> {
  const { text, overview } = await buildContext(where);

  if (llmConfigured()) {
    const result = await chat(SYSTEM_PROMPT, `PERGUNTA DO USUÁRIO: ${question}\n\nDADOS ATUAIS DA BASE:\n${text}`);
    if (result) return { answer: result.text, usedAI: true };
  }

  // Fallback determinístico (sem IA): entrega o resumo real da base.
  return {
    answer: `${overview}\n\n_(A IA não está configurada agora, então mostrei o resumo direto da base. Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY para respostas em linguagem natural.)_`,
    usedAI: false,
  };
}
