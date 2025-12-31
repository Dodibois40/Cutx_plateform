import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFICATION BANDES DE CHANT ===\n');
  
  const chants = await prisma.panel.findMany({
    where: { productType: 'BANDE_DE_CHANT' },
    take: 10,
    orderBy: { name: 'asc' }
  });
  
  console.log(`Trouvé ${chants.length} bandes de chant\n`);
  
  chants.forEach(c => {
    console.log(`${c.name}`);
    console.log(`  Ref: ${c.reference} | Code: ${c.supplierCode}`);
    console.log(`  Longueur: ${c.defaultLength}mm | Largeur: ${c.defaultWidth}mm | Épaisseur: ${c.defaultThickness}mm`);
    console.log(`  Variable: ${c.isVariableLength}`);
    console.log('');
  });
  
  // Stats
  const stats = await prisma.panel.groupBy({
    by: ['isVariableLength'],
    where: { productType: 'BANDE_DE_CHANT' },
    _count: true
  });
  console.log('Stats longueur variable:', stats);
  
  await prisma.$disconnect();
}
main();
