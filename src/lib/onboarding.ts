// Onboarding de nova corretora: semeia o catálogo inicial (produtos + seguradoras)
// para o orgId informado. Idempotente — pode rodar novamente sem duplicar.
import { prisma } from '@/lib/prisma';
import { PRODUCTS, INSURERS } from '@/lib/constants';

export async function seedOrgCatalog(orgId: string): Promise<{ products: number; insurers: number }> {
  const productData = Object.entries(PRODUCTS).map(([code, p], i) => ({
    orgId,
    code,
    label: p.label,
    color: p.color,
    emoji: p.emoji,
    category: p.category,
    sort: i,
  }));

  const insurerData = INSURERS.map((name, i) => ({ orgId, name, sort: i }));

  const [products, insurers] = await Promise.all([
    prisma.product.createMany({ data: productData, skipDuplicates: true }),
    prisma.insurer.createMany({ data: insurerData, skipDuplicates: true }),
  ]);

  return { products: products.count, insurers: insurers.count };
}
