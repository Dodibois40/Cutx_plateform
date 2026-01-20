/**
 * Corriger les données des chants BCB :
 * 1. Mettre stockStatus = "Sur devis" pour les chants sans prix
 * 2. Identifier les références corrompues (pour review manuel)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function fix() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('');

  // 1. Mettre "Sur devis" les chants sans prix
  console.log('📦 CHANTS SANS PRIX → "Sur devis"');

  const chantsWithoutPrice = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
      pricePerMl: null,
      pricePerUnit: null,
    },
  });

  console.log(`   Total sans prix: ${chantsWithoutPrice}`);

  if (!DRY_RUN) {
    const result = await prisma.panel.updateMany({
      where: {
        reference: { startsWith: 'BCB-' },
        panelType: 'CHANT',
        pricePerMl: null,
        pricePerUnit: null,
      },
      data: {
        stockStatus: 'Sur devis',
      },
    });
    console.log(`   ✅ ${result.count} mis à jour avec stockStatus = "Sur devis"`);
  }

  // 2. Identifier les références potentiellement corrompues
  console.log('\n📋 RÉFÉRENCES SUSPECTES (pour review):');

  const allBcbChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
    },
    select: { id: true, reference: true, name: true, supplierCode: true },
  });

  const suspicious: { id: string; reference: string; name: string; reason: string }[] = [];

  for (const chant of allBcbChants) {
    // Référence avec des espaces ou caractères spéciaux
    if (/\s/.test(chant.reference) || /[€\/]/.test(chant.reference)) {
      suspicious.push({ ...chant, name: chant.name || '', reason: 'Caractères invalides dans référence' });
      continue;
    }

    // Référence contenant des mots de statut
    if (/EN STOCK|Sur commande|Veuillez|contacter/i.test(chant.reference)) {
      suspicious.push({ ...chant, name: chant.name || '', reason: 'Statut dans référence' });
      continue;
    }

    // Nom très générique (moins de 15 caractères)
    if (chant.name && chant.name.length < 15) {
      suspicious.push({ ...chant, name: chant.name || '', reason: 'Nom trop court/générique' });
      continue;
    }

    // Référence timestamp (BCB-CHANT-17686...) sans supplierCode valide
    if (/BCB-CHANT-\d{13}/.test(chant.reference) && !chant.supplierCode) {
      suspicious.push({ ...chant, name: chant.name || '', reason: 'Référence timestamp sans supplierCode' });
      continue;
    }
  }

  console.log(`   Total suspectes: ${suspicious.length}`);

  // Grouper par raison
  const byReason: Record<string, typeof suspicious> = {};
  for (const s of suspicious) {
    if (!byReason[s.reason]) byReason[s.reason] = [];
    byReason[s.reason].push(s);
  }

  for (const [reason, items] of Object.entries(byReason)) {
    console.log(`\n   📌 ${reason}: ${items.length}`);
    items.slice(0, 3).forEach((item) => {
      console.log(`      - ${item.reference}`);
      console.log(`        "${item.name?.substring(0, 50)}"`);
    });
    if (items.length > 3) {
      console.log(`      ... et ${items.length - 3} autres`);
    }
  }

  // Stats finales
  console.log('\n' + '═'.repeat(60));
  console.log('📊 STATS APRÈS CORRECTION:');

  const stats = {
    total: await prisma.panel.count({
      where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT' },
    }),
    enStock: await prisma.panel.count({
      where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT', stockStatus: 'EN STOCK' },
    }),
    surDevis: await prisma.panel.count({
      where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT', stockStatus: 'Sur devis' },
    }),
    surCommande: await prisma.panel.count({
      where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT', stockStatus: 'Sur commande' },
    }),
  };

  console.log(`   Total: ${stats.total}`);
  console.log(`   EN STOCK: ${stats.enStock}`);
  console.log(`   Sur devis: ${stats.surDevis}`);
  console.log(`   Sur commande: ${stats.surCommande}`);

  await prisma.$disconnect();
}

fix().catch(console.error);
