import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPanel() {
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-PDT-86600' },
    include: {
      catalogue: true,
      category: true,
    }
  });

  if (!panel) {
    console.log('Panel not found!');
    return;
  }

  console.log('\n=== PANEL INFO ===');
  console.log('Reference:', panel.reference);
  console.log('Name:', panel.name);
  console.log('Supplier Reference:', panel.manufacturerRef);
  console.log('Supplier:', panel.manufacturer);
  console.log('Supplier Code:', panel.supplierCode);
  console.log('Coloris:', panel.colorChoice);
  console.log('Code:', panel.decorCode);
  console.log('Finition:', panel.finishName, '(', panel.finishCode, ')');
  console.log('Decor:', panel.decorName);
  console.log('Decor Category:', panel.decorCategory);
  console.log('Support:', panel.supportQuality);
  console.log('Certification:', panel.certification);
  console.log('Category:', panel.category?.name);
  console.log('\n=== COMPARAISON ===');
  console.log('Chez fournisseur - Coloris/Choix: 0720');
  console.log('Dans notre DB - Supplier Code:', panel.supplierCode);
  console.log('Dans notre DB - Manufacturer Ref:', panel.manufacturerRef);
  console.log('Dans notre DB - Decor Code:', panel.decorCode);
}

checkPanel()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
