/**
 * Script pour remplir les defaultThickness manquantes pour les panneaux
 *
 * Strategies utilisees (par ordre de priorite):
 * 1. Utiliser le tableau thickness[] si non vide
 * 2. Extraire du nom avec regex intelligente selon le type de produit
 * 3. Valeurs par defaut selon le productType/panelType
 * 4. Analyser les dimensions (si largeur ou hauteur correspond a une epaisseur standard)
 */

import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

// Valeurs par defaut selon le type de produit
const DEFAULT_THICKNESS_BY_TYPE: Record<string, number> = {
  // ProductType enum values
  MELAMINE: 19,
  STRATIFIE: 0.8,
  COMPACT: 13,
  PLACAGE: 0.6,
  AGGLO_BRUT: 19,
  MDF: 19,
  CONTREPLAQUE: 15,
  OSB: 18,
  MASSIF: 20,
  CHANT: 1,
  SOLID_SURFACE: 12,

  // Valeurs string legacy
  BANDE_DE_CHANT: 1,
  HPL: 0.8,
  CPL: 0.6,
  PLAN_DE_TRAVAIL: 38,
  PANNEAU_MURAL: 3,
  BOIS_CIMENT: 12,
  COLLE: 0, // Accessoire, pas d'epaisseur
};

// Epaisseurs standards pour la detection
const STANDARD_THICKNESSES = [0.6, 0.8, 1, 2, 3, 6, 8, 10, 12, 13, 15, 16, 18, 19, 22, 25, 28, 30, 38, 40, 50];

// Epaisseurs valides pour les bandes de chant (typiquement < 3mm)
const CHANT_THICKNESSES = [0.4, 0.5, 0.6, 0.8, 1, 1.3, 2, 2.5, 3];

interface PanelToFix {
  id: string;
  reference: string;
  name: string;
  thickness: number[];
  defaultThickness: number | null;
  defaultLength: number;
  defaultWidth: number;
  panelType: ProductType | null;
  productType: string | null;
  material: string | null;
}

interface FixResult {
  id: string;
  reference: string;
  oldThickness: number | null;
  newThickness: number;
  method: string;
}

/**
 * Extrait l'epaisseur specifiquement pour les bandes de chant
 * Pattern: "1x23mm" ou "2x23mm" ou "0,6x24mm" - le premier nombre est l'epaisseur
 */
function extractChantThickness(name: string): number | null {
  // Pattern pour bandes de chant: "Nx23mm" ou "N x 23mm"
  const chantPattern = /(\d+(?:[.,]\d+)?)\s*x\s*\d+\s*mm/i;
  const match = name.match(chantPattern);
  if (match && match[1]) {
    const value = parseFloat(match[1].replace(',', '.'));
    // Epaisseur de chant valide: entre 0.4 et 3mm
    if (value >= 0.4 && value <= 3) {
      return value;
    }
  }
  return null;
}

/**
 * Extrait l'epaisseur pour les panneaux reguliers
 * Patterns: "19mm", "epaisseur 19", etc.
 * Evite les dimensions de produits (ex: vasques avec "370 x 180 mm")
 */
function extractPanelThickness(name: string): number | null {
  // Eviter les patterns de dimensions de vasques/eviers (ex: "400 x 300 x 175 mm")
  if (/\d+\s*x\s*\d+\s*x\s*\d+\s*mm/i.test(name)) {
    return null;
  }

  // Eviter les patterns de dimensions simples (ex: "500 x 400 mm")
  if (/\d{3,}\s*x\s*\d{3,}\s*mm/i.test(name)) {
    return null;
  }

  // Pattern pour epaisseur explicite
  const explicitPatterns = [
    /[eé]paisseur\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i,  // "epaisseur 19", "epaisseur: 19mm"
    /ep\.?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i,              // "ep. 19", "ep19"
    /\b(\d+(?:[.,]\d+)?)\s*(?:ep|epaisseur)/i,           // "19ep", "19 epaisseur"
  ];

  for (const pattern of explicitPatterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1].replace(',', '.'));
      if (value > 0 && value <= 60) {
        return value;
      }
    }
  }

  // Pattern pour panneau avec dimensions: prend le premier nombre si petit (probablement epaisseur)
  // Ex: "12x1250mm 2,60m" -> epaisseur 12
  const panelDimPattern = /\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+)\s*mm/i;
  const dimMatch = name.match(panelDimPattern);
  if (dimMatch && dimMatch[1]) {
    const firstValue = parseFloat(dimMatch[1].replace(',', '.'));
    const secondValue = parseFloat(dimMatch[2]);
    // Le premier est probablement l'epaisseur si < 60 et le second est grand
    if (firstValue > 0 && firstValue <= 60 && secondValue >= 100) {
      return firstValue;
    }
  }

  // Pattern simple NNmm au debut ou apres un espace (pas precede de x ou de chiffres)
  // Evite "1x23mm" et "400x300mm"
  const simplePattern = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*mm\b/i;
  const simpleMatch = name.match(simplePattern);
  if (simpleMatch && simpleMatch[1]) {
    const value = parseFloat(simpleMatch[1].replace(',', '.'));
    // Seulement si c'est une epaisseur plausible (pas 400, 1250, etc.)
    if (value > 0 && value <= 60 && STANDARD_THICKNESSES.includes(value)) {
      return value;
    }
  }

  return null;
}

function getDefaultByType(panel: PanelToFix): number | null {
  // Priorite: panelType (enum) > productType (string) > material
  if (panel.panelType) {
    const thickness = DEFAULT_THICKNESS_BY_TYPE[panel.panelType];
    if (thickness) return thickness;
  }

  if (panel.productType) {
    const thickness = DEFAULT_THICKNESS_BY_TYPE[panel.productType.toUpperCase()];
    if (thickness) return thickness;
  }

  if (panel.material) {
    const materialUpper = panel.material.toUpperCase();
    for (const [key, value] of Object.entries(DEFAULT_THICKNESS_BY_TYPE)) {
      if (materialUpper.includes(key)) {
        return value;
      }
    }
  }

  return null;
}

function detectFromDimensions(panel: PanelToFix): number | null {
  const { defaultLength, defaultWidth } = panel;

  // Si une dimension est tres petite et correspond a une epaisseur standard
  // c'est peut-etre l'epaisseur mal placee

  // Verifier si defaultWidth est une epaisseur (< 100mm et standard)
  if (defaultWidth > 0 && defaultWidth <= 100) {
    if (STANDARD_THICKNESSES.includes(defaultWidth)) {
      return defaultWidth;
    }
    // Verifier si proche d'une epaisseur standard
    const closest = STANDARD_THICKNESSES.find(t => Math.abs(t - defaultWidth) < 1);
    if (closest && defaultLength > 500) { // S'assurer que l'autre dimension est une vraie longueur
      return closest;
    }
  }

  // De meme pour defaultLength (moins probable mais possible)
  if (defaultLength > 0 && defaultLength <= 100) {
    if (STANDARD_THICKNESSES.includes(defaultLength)) {
      return defaultLength;
    }
    const closest = STANDARD_THICKNESSES.find(t => Math.abs(t - defaultLength) < 1);
    if (closest && defaultWidth > 500) {
      return closest;
    }
  }

  return null;
}

async function main() {
  console.log('================================================================');
  console.log('   CORRECTION DES EPAISSEURS MANQUANTES');
  console.log('================================================================\n');

  // 1. Trouver tous les panneaux avec defaultThickness null ou 0
  const panelsToFix = await prisma.$queryRaw<PanelToFix[]>`
    SELECT
      id,
      reference,
      name,
      thickness,
      "defaultThickness",
      "defaultLength",
      "defaultWidth",
      "panelType",
      "productType",
      material
    FROM "Panel"
    WHERE "defaultThickness" IS NULL
       OR "defaultThickness" = 0
    ORDER BY reference
  `;

  console.log(`Panneaux avec epaisseur manquante: ${panelsToFix.length}\n`);

  if (panelsToFix.length === 0) {
    console.log('Aucun panneau a corriger!');
    return;
  }

  // Statistiques par methode
  const stats = {
    fromThicknessArray: 0,
    fromName: 0,
    fromType: 0,
    fromDimensions: 0,
    notFixed: 0,
  };

  const fixes: FixResult[] = [];
  const notFixed: PanelToFix[] = [];

  // 2. Determiner la correction pour chaque panneau
  for (const panel of panelsToFix) {
    let newThickness: number | null = null;
    let method = '';

    const productType = panel.productType?.toUpperCase() || '';
    const isChant = productType.includes('CHANT') || panel.panelType === 'CHANT';
    const isSolidSurface = productType === 'SOLID_SURFACE';
    const isAccessory = productType === 'COLLE' || productType === 'ACCESSOIRE';

    // Skip accessories (colle, etc.)
    if (isAccessory) {
      notFixed.push(panel);
      stats.notFixed++;
      continue;
    }

    // Methode 1: Utiliser thickness[]
    if (panel.thickness && panel.thickness.length > 0) {
      const validThickness = panel.thickness.find(t => t > 0 && t <= 100);
      if (validThickness) {
        newThickness = validThickness;
        method = 'thickness[]';
        stats.fromThicknessArray++;
      }
    }

    // Methode 2: Extraire du nom (selon le type de produit)
    if (!newThickness) {
      if (isChant) {
        // Pour les bandes de chant: extraire le premier nombre dans "1x23mm"
        newThickness = extractChantThickness(panel.name);
      } else if (!isSolidSurface) {
        // Pour les panneaux normaux (pas solid surface qui ont des dims de vasque)
        newThickness = extractPanelThickness(panel.name);
      }

      if (newThickness) {
        method = 'nom';
        stats.fromName++;
      }
    }

    // Methode 3: Valeur par defaut selon le type
    if (!newThickness) {
      newThickness = getDefaultByType(panel);
      if (newThickness) {
        method = 'type';
        stats.fromType++;
      }
    }

    // Methode 4: Detection depuis les dimensions
    if (!newThickness) {
      newThickness = detectFromDimensions(panel);
      if (newThickness) {
        method = 'dimensions';
        stats.fromDimensions++;
      }
    }

    if (newThickness) {
      fixes.push({
        id: panel.id,
        reference: panel.reference,
        oldThickness: panel.defaultThickness,
        newThickness,
        method,
      });
    } else {
      notFixed.push(panel);
      stats.notFixed++;
    }
  }

  // 3. Afficher le resume
  console.log('================================================================');
  console.log('   RESUME DES CORRECTIONS');
  console.log('================================================================\n');

  console.log('Methodes de correction:');
  console.log(`  - Depuis thickness[]:    ${stats.fromThicknessArray.toString().padStart(4)}`);
  console.log(`  - Depuis le nom:         ${stats.fromName.toString().padStart(4)}`);
  console.log(`  - Depuis le type:        ${stats.fromType.toString().padStart(4)}`);
  console.log(`  - Depuis les dimensions: ${stats.fromDimensions.toString().padStart(4)}`);
  console.log(`  - Non corriges:          ${stats.notFixed.toString().padStart(4)}`);
  console.log(`  --------------------------------`);
  console.log(`    TOTAL:                 ${panelsToFix.length.toString().padStart(4)}`);
  console.log('');

  // Grouper les corrections par epaisseur pour verification
  const byThickness = new Map<number, FixResult[]>();
  for (const fix of fixes) {
    const list = byThickness.get(fix.newThickness) || [];
    list.push(fix);
    byThickness.set(fix.newThickness, list);
  }

  console.log('Distribution des epaisseurs a appliquer:');
  const sortedThicknesses = [...byThickness.entries()].sort((a, b) => a[0] - b[0]);
  for (const [thickness, items] of sortedThicknesses) {
    console.log(`  ${thickness.toString().padStart(5)}mm: ${items.length} panneaux`);
  }
  console.log('');

  // Afficher les exemples de chaque methode
  console.log('Exemples de corrections:');
  console.log('');

  const methods = ['thickness[]', 'nom', 'type', 'dimensions'];
  for (const method of methods) {
    const examples = fixes.filter(f => f.method === method).slice(0, 3);
    if (examples.length > 0) {
      console.log(`  [${method}]`);
      for (const ex of examples) {
        console.log(`    ${ex.reference}: ${ex.oldThickness || 'null'} -> ${ex.newThickness}mm`);
      }
      console.log('');
    }
  }

  // Afficher les panneaux non corriges (max 20)
  if (notFixed.length > 0) {
    console.log('Panneaux NON corriges (pas assez d\'info):');
    for (const panel of notFixed.slice(0, 20)) {
      console.log(`  ${panel.reference}`);
      console.log(`    nom: ${panel.name.substring(0, 60)}...`);
      console.log(`    type: ${panel.panelType || panel.productType || 'NULL'}`);
      console.log(`    dims: ${panel.defaultLength}x${panel.defaultWidth}`);
    }
    if (notFixed.length > 20) {
      console.log(`  ... et ${notFixed.length - 20} autres`);
    }
    console.log('');
  }

  // 4. Appliquer les corrections si --fix
  const args = process.argv.slice(2);
  if (!args.includes('--fix')) {
    console.log('================================================================');
    console.log('   MODE SIMULATION - Aucune modification effectuee');
    console.log('================================================================');
    console.log('');
    console.log('Pour appliquer les corrections, relancez avec:');
    console.log('  npx tsx scripts/fix-missing-thickness.ts --fix');
    console.log('');
    return;
  }

  // Appliquer les corrections
  console.log('================================================================');
  console.log('   APPLICATION DES CORRECTIONS');
  console.log('================================================================\n');

  let applied = 0;
  let errors = 0;

  // Traiter par lots pour eviter les timeouts
  const batchSize = 100;
  for (let i = 0; i < fixes.length; i += batchSize) {
    const batch = fixes.slice(i, i + batchSize);

    for (const fix of batch) {
      try {
        await prisma.panel.update({
          where: { id: fix.id },
          data: {
            defaultThickness: fix.newThickness,
            // Aussi mettre a jour thickness[] si vide
            ...((!panelsToFix.find(p => p.id === fix.id)?.thickness?.length) ? {
              thickness: [fix.newThickness]
            } : {})
          },
        });
        applied++;
      } catch (e: any) {
        console.log(`  Erreur ${fix.reference}: ${e.message}`);
        errors++;
      }
    }

    console.log(`  Progres: ${Math.min(i + batchSize, fixes.length)}/${fixes.length}`);
  }

  console.log('');
  console.log('================================================================');
  console.log('   RESULTAT FINAL');
  console.log('================================================================');
  console.log(`  Corriges:    ${applied}`);
  console.log(`  Erreurs:     ${errors}`);
  console.log(`  Non traites: ${notFixed.length}`);
  console.log('');

  // Verification finale
  const remaining = await prisma.panel.count({
    where: {
      OR: [
        { defaultThickness: null },
        { defaultThickness: 0 },
      ]
    }
  });
  console.log(`  Panneaux restants sans epaisseur: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
