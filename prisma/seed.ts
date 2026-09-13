import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PRODUCTS } from '../src/lib/constants';

const prisma = new PrismaClient();

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function main() {
  console.log('🌱 Semeando banco de dados do CRM...');

  // Limpa em ordem de dependência
  await prisma.activity.deleteMany();
  await prisma.boleto.deleteMany();
  await prisma.sdrConversation.deleteMany();
  await prisma.sdrConfig.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.client.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.consentLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // ----- Catálogo de produtos (upsert: preserva ativações/edições do usuário) -----
  {
    let sort = 0;
    for (const [code, p] of Object.entries(PRODUCTS)) {
      await prisma.product.upsert({
        where: { code },
        update: { label: p.label, color: p.color, emoji: p.emoji, category: p.category },
        create: { code, label: p.label, color: p.color, emoji: p.emoji, category: p.category, sort: sort++ },
      });
    }
  }

  // ----- Usuários -----
  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Wesley Athar',
      email: 'admin@synapsecrm.com',
      password: passwordHash,
      role: 'ADMIN',
      phone: '(11) 99999-0000',
      acceptedTermsAt: new Date(),
      termsVersion: '2026-09-11',
      marketingConsent: true,
    },
  });

  const corretor = await prisma.user.create({
    data: {
      name: 'Ana Corretora',
      email: 'ana@synapsecrm.com',
      password: passwordHash,
      role: 'CORRETOR',
      phone: '(11) 98888-1111',
      acceptedTermsAt: new Date(),
      termsVersion: '2026-09-11',
    },
  });

  const owners = [admin.id, corretor.id];

  // ----- Clientes -----
  const clientNames = [
    'João Silva', 'Maria Oliveira', 'Carlos Souza', 'Fernanda Lima', 'Pedro Santos',
    'Juliana Costa', 'Ricardo Alves', 'Camila Rocha', 'Bruno Martins', 'Patrícia Gomes',
    'Transportadora Veloz Ltda', 'Padaria Pão Quente ME', 'Clínica Bem Estar',
  ];

  const cities: [string, string][] = [
    ['São Paulo', 'SP'], ['Campinas', 'SP'], ['Rio de Janeiro', 'RJ'],
    ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'], ['Osasco', 'SP'],
  ];

  const clients = [];
  for (let i = 0; i < clientNames.length; i++) {
    const [city, state] = rand(cities);
    clients.push(
      await prisma.client.create({
        data: {
          name: clientNames[i],
          email: `cliente${i + 1}@email.com`,
          phone: `(11) 9${String(1000 + i).padStart(4, '0')}-${String(1000 + i * 3).padStart(4, '0')}`,
          cpfCnpj: i < 10 ? `${100 + i}.${200 + i}.${300 + i}-0${i}` : `${10 + i}.${100 + i}.${200 + i}/0001-0${i}`,
          city,
          state,
          address: `Rua das Flores, ${100 + i * 7}`,
          ownerId: rand(owners),
        },
      }),
    );
  }

  const products = [
    'AUTO', 'MOTO', 'CAMINHAO', 'RESIDENCIAL', 'CONDOMINIO', 'EMPRESARIAL', 'RURAL',
    'VIDA', 'VIDA_GRUPO', 'ACIDENTES', 'SAUDE', 'ODONTO',
    'CELULAR', 'PORTATEIS', 'BIKE', 'PET', 'VIAGEM', 'GARANTIA_ESTENDIDA', 'FIANCA',
    'PREVIDENCIA', 'CAPITALIZACAO',
    'CONSORCIO_IMOVEL', 'CONSORCIO_AUTO', 'CONSORCIO_MOTO', 'CONSORCIO_SERVICOS',
  ];
  const stages = ['NOVO', 'CONTATO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO'];

  // ----- Oportunidades (funil) -----
  const productLabel: Record<string, string> = {
    AUTO: 'Seguro Auto', MOTO: 'Seguro Moto', CAMINHAO: 'Seguro Caminhão',
    RESIDENCIAL: 'Seguro Residencial', CONDOMINIO: 'Seguro Condomínio',
    EMPRESARIAL: 'Seguro Empresarial', RURAL: 'Seguro Rural',
    VIDA: 'Seguro de Vida', VIDA_GRUPO: 'Vida em Grupo', ACIDENTES: 'Acidentes Pessoais',
    SAUDE: 'Plano de Saúde', ODONTO: 'Plano Odontológico',
    CELULAR: 'Seguro Celular', PORTATEIS: 'Seguro Portáteis', BIKE: 'Seguro Bike',
    PET: 'Seguro Pet', VIAGEM: 'Seguro Viagem', GARANTIA_ESTENDIDA: 'Garantia Estendida',
    FIANCA: 'Fiança Locatícia', PREVIDENCIA: 'Previdência Privada', CAPITALIZACAO: 'Capitalização',
    CONSORCIO_IMOVEL: 'Consórcio Imóvel', CONSORCIO_AUTO: 'Consórcio Auto',
    CONSORCIO_MOTO: 'Consórcio Moto', CONSORCIO_SERVICOS: 'Consórcio Serviços',
  };

  for (let i = 0; i < 18; i++) {
    const client = rand(clients);
    const product = rand(products);
    const stage = rand(stages);
    const premium = Math.round((800 + Math.random() * 6000) * 100) / 100;
    const value = Math.round(premium * (8 + Math.random() * 12) * 100) / 100;
    const commission = Math.round(premium * (0.1 + Math.random() * 0.2) * 100) / 100;
    const isWon = stage === 'GANHO';

    await prisma.deal.create({
      data: {
        title: `${productLabel[product]} — ${client.name}`,
        product,
        stage,
        status: isWon ? 'WON' : 'OPEN',
        value,
        premium,
        commission,
        probability: stage === 'GANHO' ? 100 : rand([20, 40, 50, 60, 75]),
        expectedCloseDate: daysFromNow(rand([3, 7, 14, 21, 30])),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        ownerId: rand(owners),
        order: i,
      },
    });
  }

  // Algumas oportunidades perdidas
  for (let i = 0; i < 3; i++) {
    const client = rand(clients);
    const product = rand(products);
    await prisma.deal.create({
      data: {
        title: `${productLabel[product]} — ${client.name}`,
        product,
        stage: 'NEGOCIACAO',
        status: 'LOST',
        value: 5000,
        premium: 1200,
        commission: 180,
        probability: 0,
        lostReason: rand(['Preço alto', 'Fechou com concorrente', 'Sem retorno']),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        ownerId: rand(owners),
      },
    });
  }

  // ----- Leads -----
  const sources = ['SITE', 'INDICACAO', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'LIGACAO', 'EVENTO'];
  const leadStatus = ['NOVO', 'EM_CONTATO', 'QUALIFICADO', 'CONVERTIDO', 'PERDIDO'];
  const leadNames = [
    'Marcelo Dias', 'Renata Freitas', 'Gustavo Pereira', 'Larissa Nunes', 'Thiago Barros',
    'Aline Cardoso', 'Vinícius Melo', 'Sabrina Teixeira', 'Rodrigo Pinto', 'Beatriz Ramos',
  ];
  for (let i = 0; i < leadNames.length; i++) {
    await prisma.lead.create({
      data: {
        name: leadNames[i],
        email: `lead${i + 1}@email.com`,
        phone: `(11) 9${String(7000 + i).padStart(4, '0')}-${String(2000 + i * 5).padStart(4, '0')}`,
        source: rand(sources),
        interest: rand(products),
        status: rand(leadStatus),
        temp: rand(['FRIO', 'MORNO', 'QUENTE']),
        ownerId: rand(owners),
      },
    });
  }

  // ----- Apólices -----
  const insurers = [
    'Porto Seguro', 'Bradesco Seguros', 'SulAmérica', 'Allianz', 'Azul Seguros',
    'Itaú Seguros', 'Mapfre', 'HDI Seguros', 'Tokio Marine', 'Liberty Seguros',
  ];
  for (let i = 0; i < 12; i++) {
    const client = rand(clients);
    const product = rand(products);
    const premium = Math.round((1000 + Math.random() * 5000) * 100) / 100;
    const endDate = daysFromNow(rand([-10, 5, 15, 25, 45, 120, 300]));
    const now = new Date();
    let status = 'ATIVA';
    if (endDate < now) status = 'VENCIDA';
    else if ((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30) status = 'A_VENCER';

    await prisma.policy.create({
      data: {
        number: `AP-${2026}${String(1000 + i).padStart(5, '0')}`,
        product,
        insurer: rand(insurers),
        clientId: client.id,
        clientName: client.name,
        premium,
        commission: Math.round(premium * 0.15 * 100) / 100,
        startDate: daysFromNow(-365 + i * 5),
        endDate,
        status,
        ownerId: rand(owners),
      },
    });
  }

  // ----- Boletos a Vencer -----
  const createdPolicies = await prisma.policy.findMany();
  const dueOffsets = [-4, 1, 2, 4, 7, 12, 20];
  for (let i = 0; i < createdPolicies.length; i++) {
    const pol = createdPolicies[i];
    const offset = dueOffsets[i % dueOffsets.length];
    const dueDate = daysFromNow(offset);
    const amount = Math.round((pol.premium / 4) * 100) / 100;
    const isPaid = offset < -2;

    await prisma.boleto.create({
      data: {
        clientId: pol.clientId,
        clientName: pol.clientName,
        policyId: pol.id,
        ownerId: pol.ownerId,
        description: `Parcela ${(i % 4) + 1}/4 — Seguro ${pol.product}`,
        amount,
        dueDate,
        status: isPaid ? 'PAGO' : (offset < 0 ? 'VENCIDO' : 'PENDENTE'),
        paidAt: isPaid ? daysFromNow(offset - 1) : null,
        barcode: `34191.79001 01043.510047 91020.150008 8 ${8000 + i}00000${Math.floor(amount)}`,
        origin: 'AUTO',
        installmentNumber: (i % 4) + 1,
        installmentTotal: 4,
      },
    });
  }

  // ----- Atividades / Tarefas -----
  const activityTypes = ['LIGACAO', 'WHATSAPP', 'EMAIL', 'REUNIAO', 'TAREFA'];
  const titles = [
    'Ligar para confirmar interesse', 'Enviar proposta por WhatsApp', 'Follow-up da cotação',
    'Reunião de renovação', 'Enviar boleto', 'Retornar contato', 'Agendar vistoria',
  ];
  for (let i = 0; i < 10; i++) {
    await prisma.activity.create({
      data: {
        type: rand(activityTypes),
        title: rand(titles),
        dueDate: daysFromNow(rand([-2, -1, 0, 1, 2, 3, 5])),
        done: Math.random() > 0.6,
        ownerId: rand(owners),
      },
    });
  }

  console.log('✅ Seed concluído!');
  console.log('   Login ADMIN:    admin@synapsecrm.com / 123456');
  console.log('   Login CORRETOR: ana@synapsecrm.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
