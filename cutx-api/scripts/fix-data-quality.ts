/**
 * Comprehensive data quality fixes
 * Run with: npx tsx scripts/fix-data-quality.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 CORRECTION DE LA QUALITÉ DES DONNÉES\n');
  console.log('='.repeat(60) + '\n');

  // 1. Fix placage thickness (width stored as thickness)
  await fixPlacageThickness();

  // 2. Fix panels without productType (Bouney 3-plis panels)
  await fixMissingProductType();

  // 3. Fix edge bands without pricePerMl
  await fixRemainingChantPrices();

  // 4. Rebuild search vectors for updated panels
  await rebuildSearchVectors();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Toutes les corrections terminées!');

  await prisma.$disconnect();
}

async function fixPlacageThickness() {
  console.log('📋 1. CORRECTION DES ÉPAISSEURS PLACAGES\n');

  // Find placages with absurd thickness (> 50mm means width was stored as thickness)
  const badPlacages = await prisma.panel.findMany({
    where: {
      productType: 'PLACAGE',
      defaultThickness: { gt: 50 }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultThickness: true,
    }
  });

  console.log(`   Found ${badPlacages.length} placages with incorrect thickness\n`);

  // Placage thickness is typically:
  // - Standard veneer: 0.5-0.7mm
  // - Thick veneer (épais): 1-3mm
  // Parse from name if possible, otherwise use 0.6mm default

  let fixed = 0;
  for (const panel of badPlacages) {
    // Try to parse thickness from name
    let newThickness = 0.6; // Default veneer thickness

    // Check for thick veneer indicators
    const nameLC = panel.name.toLowerCase();
    if (nameLC.includes('épais') || nameLC.includes('epais')) {
      newThickness = 1.5;
    } else if (nameLC.includes('0,5') || nameLC.includes('0.5')) {
      newThickness = 0.5;
    } else if (nameLC.includes('0,7') || nameLC.includes('0.7')) {
      newThickness = 0.7;
    }

    // Parse explicit thickness pattern
    const thicknessMatch = panel.name.match(/(\d+[,.]?\d*)\s*mm\s*(?:d'épaisseur|épaisseur|ep\.?)/i);
    if (thicknessMatch) {
      const parsed = parseFloat(thicknessMatch[1].replace(',', '.'));
      if (parsed > 0 && parsed < 10) {
        newThickness = parsed;
      }
    }

    await prisma.panel.update({
      where: { id: panel.id },
      data: {
        thickness: [newThickness],
        defaultThickness: newThickness,
      }
    });

    console.log(`   ✓ ${panel.reference}: ${panel.defaultThickness}mm → ${newThickness}mm`);
    fixed++;
  }

  console.log(`\n   Fixed ${fixed} placages\n`);
}

async function fixMissingProductType() {
  console.log('📋 2. CORRECTION DES PRODUCTTYPE MANQUANTS\n');

  // Get all panels without productType
  const noProductType = await prisma.panel.findMany({
    where: { productType: null, isActive: true },
    select: {
      id: true,
      reference: true,
      name: true,
    }
  });

  console.log(`   Found ${noProductType.length} panels without productType\n`);

  const productTypeRules = [
    // Plans de travail
    { pattern: /plan\s*(?:de\s*)?travail/i, type: 'PLAN_DE_TRAVAIL' },
    // Kerrock (solid surface)
    { pattern: /kerrock|solid\s*surface/i, type: 'SOLID_SURFACE' },
    // Eviers, Vasques, Receveurs (Kerrock sanitaire)
    { pattern: /evier|vasque|receveur|baignoire|colonne\s*douche|cuve/i, type: 'SANITAIRE' },
    // 3-plis, triplis
    { pattern: /3[\s-]?pli|tripli/i, type: 'PANNEAU_3_PLIS' },
    // Lamellé-collé / Tablette
    { pattern: /lamell[ée]|tablette/i, type: 'PANNEAU_MASSIF' },
    // MDF / Medium
    { pattern: /\bMDF\b|medium|fibracolour/i, type: 'MDF' },
    // Contreplaqué / Durelis
    { pattern: /contreplaqu[ée]|durelis/i, type: 'CONTREPLAQUE' },
    // Aggloméré / Particule / MFP / Dalle
    { pattern: /agglom[ée]r[ée]|particule|\bMFP\b|dalle/i, type: 'PARTICULE' },
    // Mélaminé
    { pattern: /m[ée]lamin[ée]/i, type: 'MELAMINE' },
    // Stratifié
    { pattern: /stratifi[ée]/i, type: 'STRATIFIE' },
    // OSB
    { pattern: /\bOSB\b/i, type: 'OSB' },
    // Compact
    { pattern: /compact/i, type: 'COMPACT' },
    // Placage
    { pattern: /placage|feuille de bois/i, type: 'PLACAGE' },
    // Bande de chant
    { pattern: /bande de chant|chant(?:s)?\s+(?:abs|pvc|melamin)/i, type: 'BANDE_DE_CHANT' },
    // Panneaux acoustiques / décoratifs
    { pattern: /acoustic|tocca|astrata|slats|tasseau|splitt/i, type: 'PANNEAU_DECORATIF' },
    // Panneaux spéciaux (Tricoya, InfiniteX, etc.)
    { pattern: /tricoya|infinite/i, type: 'PANNEAU_SPECIAL' },
    // Viroc (ciment-bois)
    { pattern: /viroc/i, type: 'CIMENT_BOIS' },
    // Latho (flex panels)
    { pattern: /latho|flex\s*move|clicwall|ocean\s+\w+\s+oak|latt\s+\w+/i, type: 'PANNEAU_DECORATIF' },
    // GreenPanel, CompacMel
    { pattern: /greenpanel|compacmel/i, type: 'PANNEAU_SPECIAL' },
    // Latté léger, Mediland
    { pattern: /latt[ée]\s*l[ée]ger|mediland/i, type: 'PANNEAU_ALVEOLAIRE' },
    // CP Alphaply (contreplaqué)
    { pattern: /\bCP\s|alphaply/i, type: 'CONTREPLAQUE' },
    // PVC expansé
    { pattern: /\bPVC\b/i, type: 'PVC' },
    // Panneau Isolant
    { pattern: /isolant/i, type: 'PANNEAU_ISOLANT' },
    // Fibralux, Fibralac, Fibraplast
    { pattern: /fibralux|fibralac|fibraplast/i, type: 'MDF' },
    // Porte / Porte Express
    { pattern: /\bporte\b/i, type: 'PORTE' },
    // Marotte (panels)
    { pattern: /marotte/i, type: 'PANNEAU_DECORATIF' },
    // Baubuche / Multiplis hêtre
    { pattern: /baubuche|multipli/i, type: 'PANNEAU_MASSIF' },
    // Pnx (Panneau bois massif)
    { pattern: /\bPnx\b/i, type: 'PANNEAU_MASSIF' },
    // Panneau massif (generic wood panels)
    { pattern: /panneau\s+(?:ch[êe]ne|noyer|h[êe]tre|fr[êe]ne|bouleau|[ée]pic[ée]a|douglas|m[ée]l[èe]ze|pin)/i, type: 'PANNEAU_MASSIF' },
  ];

  const updates: { [key: string]: number } = {};

  for (const panel of noProductType) {
    let matched = false;
    for (const rule of productTypeRules) {
      if (rule.pattern.test(panel.name)) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: { productType: rule.type }
        });
        updates[rule.type] = (updates[rule.type] || 0) + 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Log unmatched for manual review
      console.log(`   ⚠️ Could not classify: ${panel.reference} - ${panel.name.substring(0, 60)}...`);
    }
  }

  console.log('\n   Classifications applied:');
  for (const [type, count] of Object.entries(updates)) {
    console.log(`   - ${type}: ${count}`);
  }
  console.log('');
}

async function fixRemainingChantPrices() {
  console.log('📋 3. CORRECTION DES PRIX BANDES DE CHANT RESTANTS\n');

  // Find edge bands without pricePerMl but with pricePerUnit
  const chantsWithoutPrice = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      pricePerMl: null,
      pricePerUnit: { not: null }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      pricePerUnit: true,
      defaultLength: true,
      metadata: true,
    }
  });

  console.log(`   Found ${chantsWithoutPrice.length} edge bands without pricePerMl\n`);

  let fixed = 0;
  let noLength = 0;

  for (const chant of chantsWithoutPrice) {
    // Get roll length
    let longueurRouleauM: number | null = null;

    // Try metadata
    if (chant.metadata) {
      try {
        const meta = JSON.parse(chant.metadata);
        if (meta.longueurRouleau && meta.longueurRouleau > 0) {
          longueurRouleauM = meta.longueurRouleau;
        }
      } catch {}
    }

    // Fallback to defaultLength
    if (!longueurRouleauM && chant.defaultLength > 0) {
      longueurRouleauM = chant.defaultLength / 1000;
    }

    // Parse from name
    if (!longueurRouleauM) {
      const patterns = [
        /(?:rlx|rouleau|roul\.?)\s*(?:de\s*)?(\d+)\s*m\b/i,
        /\s(\d+)\s*m\s+(?:Egger|Rehau|Ostermann)/i,
        /(\d{2,3})m\b/i,
      ];
      for (const pattern of patterns) {
        const match = chant.name.match(pattern);
        if (match) {
          const len = parseInt(match[1]);
          if (len >= 10 && len <= 500) {
            longueurRouleauM = len;
            break;
          }
        }
      }
    }

    // Default to common roll lengths based on context
    if (!longueurRouleauM) {
      // Bouney uses 23m rolls commonly
      if (chant.reference.startsWith('BCB-')) {
        longueurRouleauM = 23;
      } else {
        // Dispano typically 75m
        longueurRouleauM = 75;
      }
    }

    if (longueurRouleauM && chant.pricePerUnit) {
      const pricePerMl = chant.pricePerUnit / longueurRouleauM;
      await prisma.panel.update({
        where: { id: chant.id },
        data: { pricePerMl }
      });
      fixed++;
    } else {
      noLength++;
    }
  }

  console.log(`   Fixed: ${fixed}`);
  console.log(`   Skipped (no length): ${noLength}\n`);
}

async function rebuildSearchVectors() {
  console.log('📋 4. RECONSTRUCTION DES VECTEURS DE RECHERCHE\n');

  // Trigger search vector rebuild for all panels
  const result = await prisma.$executeRaw`
    UPDATE "Panel" SET
      "searchVector" =
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(name, ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(reference, ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("manufacturerRef", ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(decor, ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("colorChoice", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("productType", ''))), 'C') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(material, ''))), 'C'),
      "searchText" = lower(unaccent(
        coalesce(name, '') || ' ' ||
        coalesce(reference, '') || ' ' ||
        coalesce("manufacturerRef", '') || ' ' ||
        coalesce(decor, '') || ' ' ||
        coalesce("colorChoice", '') || ' ' ||
        coalesce("productType", '') || ' ' ||
        coalesce(material, '')
      ))
  `;

  console.log(`   Rebuilt search vectors for ${result} panels\n`);
}

main().catch(console.error);
