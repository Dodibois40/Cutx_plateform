import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface DimensionIssue {
  reference: string;
  name: string;
  storedDims: string;
  nameDims: string;
  issue: string;
}

function extractDimensionsFromName(name: string): { length?: number; width?: number; unit: string } | null {
  // Patterns pour extraire les dimensions du nom
  // Format: "XXXxYYYcm" ou "XXX x YYY mm" ou "XXX,YxZZZcm"
  const patterns = [
    // 204,7X917cm ou 204,7x917cm
    /(\d+(?:,\d+)?)\s*[xX]\s*(\d+(?:,\d+)?)\s*(cm|mm)/i,
    // 3050x1850mm
    /(\d+)\s*[xX]\s*(\d+)\s*(mm|cm)/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const val1 = parseFloat(match[1].replace(',', '.'));
      const val2 = parseFloat(match[2].replace(',', '.'));
      const unit = match[3].toLowerCase();

      // Convertir en mm
      const multiplier = unit === 'cm' ? 10 : 1;

      return {
        length: Math.round(Math.max(val1, val2) * multiplier),
        width: Math.round(Math.min(val1, val2) * multiplier),
        unit
      };
    }
  }
  return null;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          ANALYSE DES INCOHÉRENCES DE DIMENSIONS               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Récupérer tous les panneaux avec dimensions
  const panels = await prisma.panel.findMany({
    where: {
      defaultLength: { gt: 0 },
      defaultWidth: { gt: 0 }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      panelType: true
    }
  });

  console.log(`📊 ${panels.length} produits avec dimensions\n`);

  const issues: DimensionIssue[] = [];
  let withDimsInName = 0;
  let matching = 0;

  for (const p of panels) {
    const nameDims = extractDimensionsFromName(p.name);

    if (nameDims && nameDims.length && nameDims.width) {
      withDimsInName++;

      const storedLength = Math.max(p.defaultLength, p.defaultWidth);
      const storedWidth = Math.min(p.defaultLength, p.defaultWidth);

      // Tolérance de 5% ou 50mm
      const lengthDiff = Math.abs(nameDims.length - storedLength);
      const widthDiff = Math.abs(nameDims.width - storedWidth);

      const lengthTolerance = Math.max(storedLength * 0.05, 50);
      const widthTolerance = Math.max(storedWidth * 0.05, 50);

      if (lengthDiff > lengthTolerance || widthDiff > widthTolerance) {
        // Incohérence détectée
        let issue = '';
        if (nameDims.length > 5000 || nameDims.width > 5000) {
          issue = 'Dimensions dans le nom aberrantes (>5m)';
        } else if (lengthDiff > lengthTolerance && widthDiff > widthTolerance) {
          issue = 'Les deux dimensions ne correspondent pas';
        } else if (lengthDiff > lengthTolerance) {
          issue = 'Longueur ne correspond pas';
        } else {
          issue = 'Largeur ne correspond pas';
        }

        issues.push({
          reference: p.reference,
          name: p.name.substring(0, 60),
          storedDims: `${storedLength} × ${storedWidth} mm`,
          nameDims: `${nameDims.length} × ${nameDims.width} mm`,
          issue
        });
      } else {
        matching++;
      }
    }
  }

  console.log(`═══ RÉSULTATS ═══\n`);
  console.log(`  Produits avec dimensions dans le nom: ${withDimsInName}`);
  console.log(`  ✓ Dimensions cohérentes: ${matching}`);
  console.log(`  ✗ Incohérences détectées: ${issues.length}\n`);

  if (issues.length > 0) {
    // Grouper par type d'issue
    const byIssue: Record<string, number> = {};
    issues.forEach(i => {
      byIssue[i.issue] = (byIssue[i.issue] || 0) + 1;
    });

    console.log(`═══ PAR TYPE D'INCOHÉRENCE ═══\n`);
    Object.entries(byIssue)
      .sort((a, b) => b[1] - a[1])
      .forEach(([issue, count]) => {
        console.log(`  ${issue}: ${count}`);
      });

    console.log(`\n═══ EXEMPLES D'INCOHÉRENCES ═══\n`);

    // Afficher les 20 premiers exemples
    issues.slice(0, 20).forEach(i => {
      console.log(`[${i.reference}]`);
      console.log(`  Nom: ${i.name}...`);
      console.log(`  DB: ${i.storedDims} | Nom: ${i.nameDims}`);
      console.log(`  Issue: ${i.issue}\n`);
    });

    if (issues.length > 20) {
      console.log(`  ... et ${issues.length - 20} autres\n`);
    }

    // Chercher le produit spécifique mentionné par l'utilisateur
    const specificIssue = issues.find(i => i.reference.includes('4927074'));
    if (specificIssue) {
      console.log(`\n═══ PRODUIT SPÉCIFIQUE MENTIONNÉ ═══\n`);
      console.log(`[${specificIssue.reference}]`);
      console.log(`  Nom: ${specificIssue.name}`);
      console.log(`  DB: ${specificIssue.storedDims}`);
      console.log(`  Nom: ${specificIssue.nameDims}`);
      console.log(`  Issue: ${specificIssue.issue}\n`);
    }
  }

  // Chercher aussi les dimensions aberrantes en général
  console.log(`\n═══ DIMENSIONS ABERRANTES EN BASE ═══\n`);

  const aberrant = await prisma.panel.findMany({
    where: {
      OR: [
        { defaultLength: { gt: 10000 } }, // >10m
        { defaultWidth: { gt: 5000 } },   // >5m
        { defaultLength: { lt: 100, gt: 0 } }, // <10cm
        { defaultWidth: { lt: 50, gt: 0 } }    // <5cm (sauf chants)
      ],
      panelType: { notIn: ['CHANT'] }
    },
    select: {
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      panelType: true
    },
    take: 50
  });

  if (aberrant.length > 0) {
    console.log(`  ${aberrant.length} produits avec dimensions aberrantes:\n`);
    aberrant.slice(0, 15).forEach(p => {
      console.log(`  [${p.reference}] ${p.panelType}`);
      console.log(`    ${p.defaultLength} × ${p.defaultWidth} mm`);
      console.log(`    ${p.name.substring(0, 50)}\n`);
    });
  } else {
    console.log(`  Aucune dimension aberrante trouvée en base.\n`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
