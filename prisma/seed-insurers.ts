// Popula o catálogo de seguradoras sem apagar nenhum outro dado (idempotente).
import { PrismaClient } from '@prisma/client';
import { INSURERS } from '../src/lib/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️  Semeando catálogo de seguradoras...');
  let sort = 0;
  for (const name of INSURERS) {
    await prisma.insurer.upsert({
      where: { name },
      update: {},
      create: { name, sort: sort++ },
    });
  }
  const total = await prisma.insurer.count();
  console.log(`✅ Pronto. ${total} seguradoras no catálogo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
