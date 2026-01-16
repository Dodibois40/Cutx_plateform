import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--apply');

interface DimensionFix {
  id: string;
  reference: string;
  name: string;
  oldDims: string;
  newDims: string;
  source: string;
}

function extractDimensionsFromName(name: string): { length: number; width: number } | null {
  // Patterns pour extraire les dimensions du nom
  // Format: "280x207cm" ou "250x122 cm" ou "366x210cm"
  const patterns = [
    /(\d+)\s*[xX]\s*(\d+)\s*cm/i,
    /(\d+(?:,\d+)?)\s*[xX]\s*(\d+(?:,\d+)?)\s*cm/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const val1 = parseFloat(match[1].replace(',', '.')) * 10; // cm to mm
      const val2 = parseFloat(match[2].replace(',', '.')) * 10;

      // Retourner length > width
      return {
        length: Math.round(Math.max(val1, val2)),
        width: Math.round(Math.min(val1, val2))
      };
    }
  }
  return null;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       CORRECTION DES DIMENSIONS ABERRANTES EN BASE            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY_RUN: Les changements ne seront PAS appliqués');
    console.log('   Utilisez --apply pour appliquer les modifications\n');
  } else {
    console.log('⚠️  MODE APPLY: Les changements SERONT appliqués!\n');
  }

  // Trouver les produits avec largeur aberrante (< 100mm pour les panneaux)
  const aberrant = await prisma.panel.findMany({
    where: {
      OR: [
        { defaultWidth: { lt: 100, gt: 0 } },
        { defaultLength: { lt: 100, gt: 0 } }
      ],
      panelType: { notIn: ['CHANT'] }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      panelType: true,
      thickness: true
    }
  });

  console.log(`📊 ${aberrant.length} produits candidats trouvés\n`);

  const fixes: DimensionFix[] = [];
  const excluded: string[] = [];
  const toDelete: { id: string; reference: string; name: string }[] = [];

  for (const p of aberrant) {
    const nameLower = p.name.toLowerCase();

    // Exclure les chants et bandes de chant (même si panelType n'est pas CHANT)
    if (nameLower.includes('chant') || nameLower.includes('bande de chant')) {
      excluded.push(`${p.reference}: Chant/Bande de chant`);
      continue;
    }

    // Exclure les colles et accessoires
    if (nameLower.includes('colle') || nameLower.includes('cartouche')) {
      toDelete.push({ id: p.id, reference: p.reference, name: p.name });
      continue;
    }

    // Exclure les rouleaux (longueur > 10m = rouleau)
    if (p.defaultLength > 10000) {
      excluded.push(`${p.reference}: Rouleau (${p.defaultLength}mm)`);
      continue;
    }

    // Essayer d'extraire les dimensions du nom
    const nameDims = extractDimensionsFromName(p.name);

    let newLength = p.defaultLength;
    let newWidth = p.defaultWidth;
    let source = '';

    if (nameDims && nameDims.length > 100 && nameDims.width > 100) {
      // Utiliser les dimensions du nom si valides
      newLength = nameDims.length;
      newWidth = nameDims.width;
      source = 'Extrait du nom';
    } else {
      // Valeurs par défaut selon le type
      const currentLength = Math.max(p.defaultLength, p.defaultWidth);

      // La petite dimension est probablement l'épaisseur
      // Utiliser des largeurs standards
      if (currentLength >= 3000) {
        newWidth = currentLength >= 3600 ? 2100 : 1500;
      } else if (currentLength >= 2800) {
        newWidth = 2070; // Format Egger standard
      } else if (currentLength >= 2500) {
        newWidth = 1220;
      } else if (currentLength >= 2440) {
        newWidth = 1220;
      } else {
        newWidth = 1220; // Par défaut
      }
      newLength = currentLength;
      source = 'Largeur standard estimée';
    }

    // Vérifier si c'est vraiment une correction nécessaire
    const oldWidth = Math.min(p.defaultLength, p.defaultWidth);
    if (oldWidth < 100 && newWidth >= 100) {
      fixes.push({
        id: p.id,
        reference: p.reference,
        name: p.name.substring(0, 55),
        oldDims: `${p.defaultLength} × ${p.defaultWidth} mm`,
        newDims: `${newLength} × ${newWidth} mm`,
        source
      });
    }
  }

  // Afficher les exclusions
  if (excluded.length > 0) {
    console.log(`═══ EXCLUS (${excluded.length}) ═══\n`);
    excluded.forEach(e => console.log(`  ⊘ ${e}`));
    console.log('');
  }

  // Afficher les produits à supprimer
  if (toDelete.length > 0) {
    console.log(`═══ À SUPPRIMER (accessoires/colles): ${toDelete.length} ═══\n`);
    toDelete.forEach(p => {
      console.log(`  🗑️ [${p.reference}] ${p.name.substring(0, 50)}`);
    });
    console.log('');
  }

  console.log(`═══ CORRECTIONS À APPLIQUER: ${fixes.length} ═══\n`);

  for (const f of fixes) {
    console.log(`[${f.reference}]`);
    console.log(`  ${f.name}...`);
    console.log(`  ${f.oldDims} → ${f.newDims}`);
    console.log(`  Source: ${f.source}\n`);
  }

  if (!DRY_RUN) {
    // Supprimer les accessoires
    if (toDelete.length > 0) {
      console.log('🗑️ Suppression des accessoires...\n');
      for (const p of toDelete) {
        try {
          await prisma.panel.delete({ where: { id: p.id } });
          console.log(`  ✓ Supprimé: ${p.reference}`);
        } catch (e) {
          console.error(`  ❌ ${p.reference}:`, (e as Error).message);
        }
      }
      console.log('');
    }

    // Appliquer les corrections de dimensions
    if (fixes.length > 0) {
      console.log('🔄 Application des corrections de dimensions...\n');

      let applied = 0;
      let errors = 0;

      for (const f of fixes) {
        try {
          const [newLength, newWidth] = f.newDims.replace(' mm', '').split(' × ').map(Number);

          await prisma.panel.update({
            where: { id: f.id },
            data: {
              defaultLength: newLength,
              defaultWidth: newWidth
            }
          });
          applied++;
          console.log(`  ✓ ${f.reference}`);
        } catch (e) {
          errors++;
          console.error(`  ❌ ${f.reference}:`, (e as Error).message);
        }
      }

      console.log(`\n✅ Corrections appliquées!`);
      console.log(`   - Corrigés: ${applied}`);
      console.log(`   - Erreurs: ${errors}`);
    }
  } else if (fixes.length > 0 || toDelete.length > 0) {
    console.log('💡 Pour appliquer ces corrections, exécutez:');
    console.log('   npx tsx scripts/fix-aberrant-dimensions.ts --apply\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
