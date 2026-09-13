import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function createEvolutionPayload(phone: string, pushName: string, text: string) {
  return {
    event: 'messages.upsert',
    instance: 'synapse',
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: `MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
      pushName,
      message: {
        conversation: text,
      },
      messageType: 'conversation',
    },
  };
}

async function sendWebhookMessage(phone: string, pushName: string, text: string) {
  const payload = createEvolutionPayload(phone, pushName, text);
  const res = await fetch('http://127.0.0.1:3000/api/sdr/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  return await res.json();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation() {
  console.log('🚀 Iniciando Simulação Completa de Leads via Evolution API Webhook...\n');

  // Garante que o servidor HTTP está pronto
  let ready = false;
  for (let i = 0; i < 15; i++) {
    try {
      const ping = await fetch('http://127.0.0.1:3000/api/sdr/webhook');
      if (ping.ok) {
        ready = true;
        break;
      }
    } catch {
      await sleep(1000);
    }
  }

  if (!ready) {
    console.error('❌ Não foi possível conectar ao servidor http://127.0.0.1:3000');
    return;
  }
  console.log('✅ Conexão com http://127.0.0.1:3000/api/sdr/webhook estabelecida com sucesso!\n');

  const phone1 = '5511977771111'; // Rodrigo Mendes
  const phone2 = '5511966662222'; // Beatriz Silveira
  const phone3 = '5511955553333'; // Marcos Tavares

  // Limpa leads anteriores desses testes para começar do zero
  const oldLeads = await prisma.lead.findMany({ where: { phone: { in: [phone1, phone2, phone3] } } });
  const oldIds = oldLeads.map((l) => l.id);
  await prisma.sdrConversation.deleteMany({ where: { leadId: { in: oldIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: oldIds } } });
  await prisma.activity.deleteMany({ where: { title: { contains: 'Lead qualificado via SDR' } } });

  // -------------------------------------------------------------
  // CENÁRIO 1: Lead Quente — Cotação de Seguro Auto (Rodrigo Mendes)
  // -------------------------------------------------------------
  console.log('========================================================');
  console.log('📱 CENÁRIO 1: Lead Quente — Cotação Seguro Auto (Rodrigo Mendes)');
  console.log('========================================================');
  const name1 = 'Rodrigo Mendes';

  console.log(`[Turno 1 - Início]: Lead entra em contato`);
  await sendWebhookMessage(phone1, name1, 'Olá, gostaria de informações');

  console.log(`[Turno 2 - Resposta às Boas-vindas]: Lead confirma`);
  await sendWebhookMessage(phone1, name1, 'Sim, pode perguntar!');

  console.log(`[Turno 3 - Intenção]: Escolhe opção "2" (Solicitar orçamento)`);
  await sendWebhookMessage(phone1, name1, '2');

  console.log(`[Turno 4 - Interesse]: Especifica o produto/veículo`);
  await sendWebhookMessage(phone1, name1, 'Seguro completo para Jeep Compass 2023');

  console.log(`[Turno 5 - Necessidade]: Descreve detalhadamente a necessidade`);
  await sendWebhookMessage(phone1, name1, 'Uso diário para trabalhar, preciso de cobertura para terceiros e guincho ilimitado');

  console.log(`[Turno 6 - Prazo]: Opção "1" (O quanto antes / Imediato)`);
  await sendWebhookMessage(phone1, name1, '1');

  console.log(`[Turno 7 - Contato/Finalização]: Informa nome e cidade`);
  const finalRes1 = await sendWebhookMessage(phone1, name1, 'Rodrigo Mendes, São Paulo - SP');
  console.log('  → Conclusão Turno 7:', finalRes1);

  // -------------------------------------------------------------
  // CENÁRIO 2: Lead Morno — Plano de Saúde (Beatriz Silveira)
  // -------------------------------------------------------------
  console.log('\n========================================================');
  console.log('📱 CENÁRIO 2: Lead Morno — Plano de Saúde (Beatriz Silveira)');
  console.log('========================================================');
  const name2 = 'Beatriz Silveira';

  console.log(`[Turno 1 - Início]: Lead entra em contato`);
  await sendWebhookMessage(phone2, name2, 'Bom dia, gostaria de tirar uma dúvida');

  console.log(`[Turno 2 - Resposta Boas-vindas]:`);
  await sendWebhookMessage(phone2, name2, 'Pode falar');

  console.log(`[Turno 3 - Intenção]: Escolhe "1" (Conhecer serviços)`);
  await sendWebhookMessage(phone2, name2, '1');

  console.log(`[Turno 4 - Interesse]: Produto`);
  await sendWebhookMessage(phone2, name2, 'Plano de saúde familiar');

  console.log(`[Turno 5 - Necessidade]:`);
  await sendWebhookMessage(phone2, name2, 'Estamos pesquisando opções para 3 pessoas');

  console.log(`[Turno 6 - Prazo]: "2" (Até 30 dias)`);
  await sendWebhookMessage(phone2, name2, '2');

  console.log(`[Turno 7 - Contato]:`);
  const finalRes2 = await sendWebhookMessage(phone2, name2, 'Beatriz Silveira, Campinas');
  console.log('  → Conclusão Turno 7:', finalRes2);

  // -------------------------------------------------------------
  // CENÁRIO 3: Transbordo Imediato (Marcos Tavares)
  // -------------------------------------------------------------
  console.log('\n========================================================');
  console.log('📱 CENÁRIO 3: Transbordo Imediato por Palavra-chave (Marcos Tavares)');
  console.log('========================================================');
  const name3 = 'Marcos Tavares';

  console.log(`[Turno 1 - Início]:`);
  await sendWebhookMessage(phone3, name3, 'Olá');

  console.log(`[Turno 2 - Gatilho de Atendente Humano]:`);
  const finalRes3 = await sendWebhookMessage(phone3, name3, 'quero falar com um atendente urgente');
  console.log('  → Conclusão Turno 2:', finalRes3);

  // -------------------------------------------------------------
  // CONSULTA E EXIBIÇÃO NO BANCO DE DADOS
  // -------------------------------------------------------------
  console.log('\n========================================================');
  console.log('📊 LEADS GERADOS NO BANCO DE DADOS PELO SDR:');
  console.log('========================================================');

  const leads = await prisma.lead.findMany({
    where: {
      phone: { in: [phone1, phone2, phone3] },
    },
    include: {
      sdrConversations: true,
    },
    orderBy: { sdrScore: 'desc' },
  });

  for (const l of leads) {
    console.log(`\n--------------------------------------------------------`);
    console.log(`👤 Nome:           ${l.name}`);
    console.log(`📱 Telefone:       ${l.phone}`);
    console.log(`🔥 Temperatura:    ${l.temp}`);
    console.log(`🎯 Status CRM:     ${l.status}`);
    console.log(`🤖 Status SDR:     ${l.sdrStatus}`);
    console.log(`📈 Score:          ${l.sdrScore} pts (${l.sdrClassification})`);
    console.log(`🏙️ Cidade:         ${l.sdrCity || 'N/A'}`);
    console.log(`⏱️ Prazo:          ${l.sdrDeadline || 'N/A'}`);
    console.log(`💬 Total msgs:     ${(l.sdrConversations[0]?.messages as any[])?.length || 0} mensagens trocadas`);
    console.log(`📋 Resumo gerado para o Corretor:\n${l.sdrSummary || 'N/A'}`);
  }

  // Consulta atividades geradas para o corretor
  const activities = await prisma.activity.findMany({
    where: {
      type: 'WHATSAPP',
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log('\n========================================================');
  console.log(`🔔 TAREFAS/NOTIFICAÇÕES CRIADAS NA AGENDA DO CORRETOR (${activities.length}):`);
  console.log('========================================================');
  for (const act of activities) {
    console.log(`\n📌 Título: ${act.title}`);
    console.log(`   Data de Vencimento: ${act.dueDate.toLocaleString('pt-BR')}`);
    console.log(`   Concluída: ${act.done ? 'Sim' : 'Não'}`);
  }

  console.log('\n✨ Simulação e geração de leads concluída com sucesso absoluto!\n');
}

runSimulation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
