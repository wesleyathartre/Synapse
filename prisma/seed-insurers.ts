// Popula o catálogo de seguradoras sem apagar nenhum outro dado (idempotente).
import { PrismaClient } from '@prisma/client';
import { INSURERS } from '../src/lib/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️  Semeando catálogo de seguradoras...');

  // Este catálogo pertence à organização demo (ajuste o slug se necessário).
  const org = await prisma.organization.findFirst({
    where: { slug: 'corretora-demo' },
  });
  if (!org) {
    throw new Error('Organização "corretora-demo" não encontrada. Rode o seed principal antes.');
  }

  let sort = 0;
  for (const name of INSURERS) {
    await prisma.insurer.upsert({
      where: { orgId_name: { orgId: org.id, name } },
      update: {},
      create: { name, sort: sort++, orgId: org.id },
    });
  }
  const total = await prisma.insurer.count({ where: { orgId: org.id } });
  console.log(`✅ Pronto. ${total} seguradoras no catálogo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
