import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: { reviewStatus: 'NON_VERIFIE' },
    take: 10,
    select: {
      id: true,
      name: true,
      reference: true,
      manufacturerRef: true,
      productType: true,
      panelType: true,
      panelSubType: true,
      decorCode: true,
      decorCategory: true,
      decorName: true,
      decorSubCategory: true,
      finish: true,
      finishCode: true,
      manufacturer: true,
    }
  });
  console.log(JSON.stringify(panels, null, 2));
}
main().then(() => prisma.$disconnect()).catch(e => console.error(e));
