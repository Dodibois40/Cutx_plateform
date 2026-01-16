#!/usr/bin/env npx tsx
/**
 * Analyse de la distribution des images des panneaux
 *
 * Usage:
 *   npx tsx scripts/count-panel-images.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://cdn.cutx.ai';

function getUrlType(url: string | null): string {
  if (!url) return 'none';
  if (url.startsWith(R2_PUBLIC_URL)) return 'r2';
  if (url.includes('firebasestorage.googleapis.com')) return 'firebase';
  if (url.startsWith('/uploads/')) return 'local';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
  return 'unknown';
}

async function main() {
  console.log('📊 Analyse des images des panneaux\n');

  // Compter par catalogue
  const catalogues = await prisma.catalogue.findMany({
    include: {
      _count: { select: { panels: true } },
    },
  });

  const stats: Record<string, Record<string, number>> = {};
  const globalStats: Record<string, number> = {
    total: 0,
    none: 0,
    r2: 0,
    firebase: 0,
    local: 0,
    external: 0,
    unknown: 0,
  };

  for (const catalogue of catalogues) {
    const panels = await prisma.panel.findMany({
      where: { catalogueId: catalogue.id },
      select: { imageUrl: true },
    });

    stats[catalogue.slug] = {
      total: panels.length,
      none: 0,
      r2: 0,
      firebase: 0,
      local: 0,
      external: 0,
      unknown: 0,
    };

    for (const panel of panels) {
      const type = getUrlType(panel.imageUrl);
      stats[catalogue.slug][type]++;
      globalStats[type]++;
      globalStats.total++;
    }
  }

  // Affichage
  console.log('='.repeat(80));
  console.log('| Catalogue'.padEnd(25) + '| Total'.padEnd(10) + '| R2'.padEnd(8) + '| Firebase'.padEnd(12) + '| Local'.padEnd(10) + '| Externe'.padEnd(12) + '| Aucune |');
  console.log('='.repeat(80));

  const sortedCatalogues = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);

  for (const [slug, data] of sortedCatalogues) {
    if (data.total === 0) continue;
    console.log(
      '| ' +
        slug.padEnd(23) +
        '| ' +
        String(data.total).padEnd(8) +
        '| ' +
        String(data.r2).padEnd(6) +
        '| ' +
        String(data.firebase).padEnd(10) +
        '| ' +
        String(data.local).padEnd(8) +
        '| ' +
        String(data.external).padEnd(10) +
        '| ' +
        String(data.none).padEnd(6) +
        ' |',
    );
  }

  console.log('='.repeat(80));
  console.log(
    '| TOTAL'.padEnd(25) +
      '| ' +
      String(globalStats.total).padEnd(8) +
      '| ' +
      String(globalStats.r2).padEnd(6) +
      '| ' +
      String(globalStats.firebase).padEnd(10) +
      '| ' +
      String(globalStats.local).padEnd(8) +
      '| ' +
      String(globalStats.external).padEnd(10) +
      '| ' +
      String(globalStats.none).padEnd(6) +
      ' |',
  );
  console.log('='.repeat(80));

  // Pourcentages
  const withImage = globalStats.total - globalStats.none;
  console.log('\n📈 Résumé:');
  console.log(`   Total panneaux: ${globalStats.total}`);
  console.log(`   Avec image: ${withImage} (${((withImage / globalStats.total) * 100).toFixed(1)}%)`);
  console.log(`   Sans image: ${globalStats.none} (${((globalStats.none / globalStats.total) * 100).toFixed(1)}%)`);

  if (withImage > 0) {
    console.log('\n📦 Distribution des images:');
    console.log(`   R2 (CDN): ${globalStats.r2} (${((globalStats.r2 / withImage) * 100).toFixed(1)}%)`);
    console.log(`   Firebase: ${globalStats.firebase} (${((globalStats.firebase / withImage) * 100).toFixed(1)}%)`);
    console.log(`   Local: ${globalStats.local} (${((globalStats.local / withImage) * 100).toFixed(1)}%)`);
    console.log(`   Externe: ${globalStats.external} (${((globalStats.external / withImage) * 100).toFixed(1)}%)`);
  }

  // À migrer
  const toMigrate = globalStats.firebase + globalStats.local + globalStats.external;
  if (toMigrate > 0) {
    console.log(`\n🔄 À migrer vers R2: ${toMigrate} images`);
    console.log('   Commande: npx tsx scripts/migrate-images-to-r2.ts --dry-run');
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Erreur:', error);
  await prisma.$disconnect();
  process.exit(1);
});
