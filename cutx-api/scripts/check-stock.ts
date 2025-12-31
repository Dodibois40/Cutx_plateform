/**
 * Vérification rapide des stocks des panneaux
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Compter par statut de stock
  const enStock = await prisma.panel.count({
    where: { stockStatus: 'EN STOCK' }
  });

  const surCommande = await prisma.panel.count({
    where: { stockStatus: 'Sur commande' }
  });

  const sansStock = await prisma.panel.count({
    where: { stockStatus: null }
  });

  const total = await prisma.panel.count();

  console.log('\n📊 RÉPARTITION DES STOCKS\n');
  console.log(`   ✅ En stock:      ${enStock}`);
  console.log(`   📦 Sur commande:  ${surCommande}`);
  console.log(`   ❓ Non renseigné: ${sansStock}`);
  console.log(`   📋 Total:         ${total}`);

  // Quelques exemples avec stock
  console.log('\n📋 Exemples avec stock EN STOCK:');
  const samplesEnStock = await prisma.panel.findMany({
    where: { stockStatus: 'EN STOCK' },
    select: { reference: true, name: true, stockStatus: true },
    take: 5
  });
  samplesEnStock.forEach(p => console.log(`  - ${p.reference}: ${p.stockStatus}`));

  console.log('\n📋 Exemples avec stock Sur commande:');
  const samplesSurCommande = await prisma.panel.findMany({
    where: { stockStatus: 'Sur commande' },
    select: { reference: true, name: true, stockStatus: true },
    take: 5
  });
  samplesSurCommande.forEach(p => console.log(`  - ${p.reference}: ${p.stockStatus}`));

  await prisma.$disconnect();
}

main();
