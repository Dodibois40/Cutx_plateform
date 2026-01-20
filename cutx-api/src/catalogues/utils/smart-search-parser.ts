/**
 * Smart Search Parser - Recherche Intelligente CutX
 *
 * Parse une requête en langage naturel et extrait les filtres automatiquement.
 * Exemples:
 * - "mdf 19" → { productTypes: ['MDF'], thickness: 19 }
 * - "méla gris foncé" → { productTypes: ['MELAMINE'], colors: ['gris'], searchText: 'foncé' }
 * - "agglo chêne 19" → { materials: ['agglo'], woods: ['chêne'], thickness: 19 }
 */

// ============================================================================
// DICTIONNAIRE DE SYNONYMES - TYPES DE PRODUITS
// ============================================================================

export const PRODUCT_TYPE_SYNONYMS: Record<string, string> = {
  // Mélaminé
  mela: 'MELAMINE', melamine: 'MELAMINE', méla: 'MELAMINE', mélamine: 'MELAMINE',
  mélaminé: 'MELAMINE', mfc: 'MELAMINE',
  // Stratifié
  strat: 'STRATIFIE', stratifie: 'STRATIFIE', stratifié: 'STRATIFIE',
  hpl: 'STRATIFIE', laminé: 'STRATIFIE', lamine: 'STRATIFIE',
  // MDF
  mdf: 'MDF', medium: 'MDF', médium: 'MDF', fibre: 'MDF',
  // Bande de chant
  chant: 'BANDE_DE_CHANT', chants: 'BANDE_DE_CHANT', bande: 'BANDE_DE_CHANT',
  bordure: 'BANDE_DE_CHANT', abs: 'BANDE_DE_CHANT',
  // Compact
  compact: 'COMPACT', compacte: 'COMPACT',
  // Contreplaqué
  cp: 'CONTREPLAQUE', contreplaque: 'CONTREPLAQUE', contreplaqué: 'CONTREPLAQUE',
  multiplis: 'CONTREPLAQUE',
  // Particule / Aggloméré
  agglo: 'PARTICULE', agglomere: 'PARTICULE', aggloméré: 'PARTICULE',
  particule: 'PARTICULE', particules: 'PARTICULE',
  // OSB
  osb: 'OSB',
  // Placage
  placage: 'PLACAGE', replaque: 'PLACAGE', replaqué: 'PLACAGE',
  // Plan de travail
  pdt: 'PLAN_DE_TRAVAIL',
  // Panneau massif
  massif: 'PANNEAU_MASSIF',
  // Solid Surface
  solid: 'SOLID_SURFACE', corian: 'SOLID_SURFACE',
  // Panneau Mural
  mural: 'PANNEAU_MURAL', muraux: 'PANNEAU_MURAL',
  // Panneau Décoratif (acoustique, design)
  decoratif: 'PANNEAU_DECORATIF', décoratif: 'PANNEAU_DECORATIF',
  acoustique: 'PANNEAU_DECORATIF', design: 'PANNEAU_DECORATIF',
  // Panneau 3 Plis
  '3plis': 'PANNEAU_3_PLIS', 'trois-plis': 'PANNEAU_3_PLIS',
  triplis: 'PANNEAU_3_PLIS', triply: 'PANNEAU_3_PLIS', '3-plis': 'PANNEAU_3_PLIS',
  // Latté (panneau lamellé-collé)
  latte: 'LATTE', latté: 'LATTE', lamelle: 'LATTE', lamellé: 'LATTE',
  // Panneau Isolant
  isolant: 'PANNEAU_ISOLANT', isolation: 'PANNEAU_ISOLANT',
  thermique: 'PANNEAU_ISOLANT',
  // Panneau Alvéolaire
  alveolaire: 'PANNEAU_ALVEOLAIRE', alvéolaire: 'PANNEAU_ALVEOLAIRE',
  // Ciment-Bois (Fermacell, etc.)
  ciment: 'CIMENT_BOIS', fermacell: 'CIMENT_BOIS', aquapanel: 'CIMENT_BOIS',
};

// Mapping des types de produits vers les noms complets pour recherche textuelle
// Utilisé quand on combine support + essence (ex: "agglo chêne")
export const PRODUCT_TYPE_FULL_NAMES: Record<string, string[]> = {
  MELAMINE: ['mélaminé', 'melamine', 'mélamine'],
  STRATIFIE: ['stratifié', 'stratifie', 'laminé'],
  MDF: ['mdf', 'medium', 'fibre'],
  PARTICULE: ['aggloméré', 'agglomere', 'particule', 'agglo'],
  CONTREPLAQUE: ['contreplaqué', 'contreplaque', 'multiplis', 'cp'],
  OSB: ['osb'],
  PLACAGE: ['placage', 'plaqué'],
  COMPACT: ['compact'],
  PANNEAU_MURAL: ['mural', 'muraux', 'revêtement mural'],
  PANNEAU_DECORATIF: ['décoratif', 'decoratif', 'acoustique', 'design'],
  PANNEAU_3_PLIS: ['3 plis', '3plis', 'trois plis', 'triplis'],
  LATTE: ['latté', 'latte', 'lamellé', 'lamelle'],
  PANNEAU_ISOLANT: ['isolant', 'isolation', 'thermique'],
  PANNEAU_ALVEOLAIRE: ['alvéolaire', 'alveolaire', 'nid d\'abeille'],
  CIMENT_BOIS: ['ciment', 'fermacell', 'aquapanel'],
};

// ============================================================================
// DICTIONNAIRE - ESSENCES DE BOIS
// ============================================================================

export const WOOD_SYNONYMS: Record<string, string[]> = {
  // Essences européennes
  chene: ['chêne', 'Chêne', 'chene', 'oak', 'Oak'],
  chêne: ['chêne', 'Chêne', 'oak'],
  noyer: ['noyer', 'Noyer', 'walnut', 'Walnut'],
  hetre: ['hêtre', 'Hêtre', 'beech'],
  hêtre: ['hêtre', 'Hêtre', 'beech'],
  frene: ['frêne', 'Frêne', 'ash'],
  frêne: ['frêne', 'Frêne', 'ash'],
  erable: ['érable', 'Érable', 'maple'],
  érable: ['érable', 'Érable', 'maple'],
  pin: ['pin', 'Pin', 'pine'],
  sapin: ['sapin', 'Sapin', 'épicéa'],
  epicea: ['épicéa', 'Épicéa', 'spruce'],
  bouleau: ['bouleau', 'Bouleau', 'birch'],
  merisier: ['merisier', 'Merisier', 'cherry'],
  cerisier: ['cerisier', 'Cerisier', 'cherry'],
  chataignier: ['châtaignier', 'Châtaignier', 'chestnut'],
  châtaignier: ['châtaignier', 'Châtaignier', 'chestnut'],
  chataigner: ['châtaignier', 'Châtaignier', 'chestnut'],  // Faute courante
  chateignier: ['châtaignier', 'Châtaignier', 'chestnut'], // Faute courante
  tilleul: ['tilleul', 'Tilleul', 'linden'],
  aulne: ['aulne', 'Aulne', 'alder'],
  charme: ['charme', 'Charme', 'hornbeam'],
  peuplier: ['peuplier', 'Peuplier', 'poplar'],
  platane: ['platane', 'Platane', 'plane'],
  // Essences exotiques
  teck: ['teck', 'Teck', 'teak'],
  wenge: ['wengé', 'Wengé', 'wenge'],
  acacia: ['acacia', 'Acacia'],
  olivier: ['olivier', 'Olivier', 'olive'],
  orme: ['orme', 'Orme', 'elm'],
  zebrano: ['zébrano', 'Zebrano'],
  palissandre: ['palissandre', 'Palissandre', 'rosewood'],
  // Essences africaines
  sapelli: ['sapelli', 'Sapelli', 'sapele'],
  iroko: ['iroko', 'Iroko'],
  okoume: ['okoumé', 'Okoumé', 'okoume'],
  okoumé: ['okoumé', 'Okoumé'],
  sipo: ['sipo', 'Sipo', 'utile'],
  acajou: ['acajou', 'Acajou', 'mahogany'],
  ayous: ['ayous', 'Ayous', 'obeche'],
  padouk: ['padouk', 'Padouk', 'padauk'],
  doussie: ['doussié', 'Doussié', 'afzelia'],
  doussié: ['doussié', 'Doussié', 'afzelia'],
  movingui: ['movingui', 'Movingui'],
  framire: ['framiré', 'Framiré'],
  framiré: ['framiré', 'Framiré'],
  // Essences américaines
  tulipier: ['tulipier', 'Tulipier', 'tulip', 'yellow poplar'],
  ipe: ['ipé', 'Ipé', 'ipe'],
  ipé: ['ipé', 'Ipé'],
  jatoba: ['jatoba', 'Jatoba', 'brazilian cherry'],
  // Résineux
  meleze: ['mélèze', 'Mélèze', 'larch'],
  mélèze: ['mélèze', 'Mélèze', 'larch'],
  cedre: ['cèdre', 'Cèdre', 'cedar'],
  cèdre: ['cèdre', 'Cèdre', 'cedar'],
  douglas: ['douglas', 'Douglas'],
  // Autres
  bambou: ['bambou', 'Bambou', 'bamboo'],
  robinier: ['robinier', 'Robinier', 'robinia', 'acacia'],
};

// ============================================================================
// DICTIONNAIRE - COULEURS
// ============================================================================

export const COLOR_SYNONYMS: Record<string, string[]> = {
  // Blancs (clé française = forme canonique)
  blanc: ['blanc', 'Blanc', 'white', 'bianco', 'blanco'],
  creme: ['crème', 'Crème', 'cream', 'ivoire'],
  ivoire: ['ivoire', 'Ivoire', 'ivory'],
  // Gris
  gris: ['gris', 'Gris', 'grey', 'gray', 'grigio'],
  anthracite: ['anthracite', 'Anthracite'],
  ardoise: ['ardoise', 'Ardoise', 'slate'],
  taupe: ['taupe', 'Taupe'],
  graphite: ['graphite', 'Graphite'],
  // Noirs
  noir: ['noir', 'Noir', 'black', 'nero'],
  // Beiges / Marrons
  beige: ['beige', 'Beige', 'sable'],
  sable: ['sable', 'Sable', 'sand'],
  marron: ['marron', 'Marron', 'brown', 'brun'],
  brun: ['brun', 'Brun', 'brown'],
  caramel: ['caramel', 'Caramel'],
  chocolat: ['chocolat', 'Chocolat'],
  cafe: ['café', 'Café', 'coffee'],
  cappuccino: ['cappuccino', 'Cappuccino'],
  // Bleus
  bleu: ['bleu', 'Bleu', 'blue', 'blu'],
  navy: ['navy', 'bleu marine'],
  marine: ['marine', 'navy'],
  turquoise: ['turquoise', 'Turquoise'],
  // Verts
  vert: ['vert', 'Vert', 'green', 'verde'],
  olive: ['olive', 'Olive'],
  sauge: ['sauge', 'Sauge', 'sage'],
  // Rouges / Roses
  rouge: ['rouge', 'Rouge', 'red', 'rosso'],
  bordeaux: ['bordeaux', 'Bordeaux'],
  rose: ['rose', 'Rose', 'pink'],
  corail: ['corail', 'Corail'],
  // Jaunes / Oranges
  jaune: ['jaune', 'Jaune', 'yellow', 'giallo'],
  orange: ['orange', 'Orange', 'arancione'],
  curry: ['curry', 'Curry', 'moutarde'],
  moutarde: ['moutarde', 'Moutarde'],
  // Métalliques
  cuivre: ['cuivre', 'Cuivre', 'copper'],
  or: ['or', 'Or', 'gold', 'doré'],
  dore: ['doré', 'Doré', 'gold'],
  argent: ['argent', 'Argent', 'silver'],
  chrome: ['chrome', 'Chrome'],
  inox: ['inox', 'Inox'],
  alu: ['aluminium', 'Aluminium', 'alu'],
  aluminium: ['aluminium', 'Aluminium'],
};

// ============================================================================
// DICTIONNAIRE - QUALIFICATIFS DE COULEUR
// ============================================================================

export const COLOR_QUALIFIERS: Record<string, string[]> = {
  fonce: ['foncé', 'fonce', 'dark', 'sombre'],
  foncé: ['foncé', 'dark', 'sombre'],
  clair: ['clair', 'light', 'pâle'],
  pale: ['pâle', 'pale', 'clair'],
  vif: ['vif', 'bright', 'intense'],
  pastel: ['pastel', 'doux', 'soft'],
  mat: ['mat', 'matte', 'satiné'],
  brillant: ['brillant', 'gloss', 'laqué'],
  naturel: ['naturel', 'natural', 'nature'],
};

// ============================================================================
// DICTIONNAIRE - DÉCORS SPÉCIAUX
// ============================================================================

export const DECOR_PATTERNS: Record<string, string[]> = {
  beton: ['béton', 'Béton', 'concrete', 'ciment'],
  béton: ['béton', 'Béton', 'concrete'],
  marbre: ['marbre', 'Marbre', 'marble'],
  pierre: ['pierre', 'Pierre', 'stone'],
  granit: ['granit', 'Granit', 'granite'],
  terrazzo: ['terrazzo', 'Terrazzo'],
  ceramique: ['céramique', 'Céramique', 'ceramic'],
  textile: ['textile', 'Textile', 'tissu', 'lin'],
  metal: ['métal', 'Métal', 'metal', 'métallique'],
  oxyde: ['oxydé', 'oxyde', 'rouille', 'rust'],
  uni: ['uni', 'Uni', 'solid', 'plain'],
};

// ============================================================================
// DICTIONNAIRE - SOUS-CATÉGORIES / QUALITÉS
// ============================================================================

export const SUBCATEGORY_SYNONYMS: Record<string, string[]> = {
  // Qualités de base
  standard: ['standard', 'Standard', 'std', 'basique'],
  hydrofuge: ['hydrofuge', 'Hydrofuge', 'hydro', 'P3', 'ctbh', 'CTBH'],
  ignifuge: ['ignifugé', 'ignifuge', 'Ignifugé', 'Ignifuge', 'M1', 'feu'],

  // MDF spécifiques
  teinte: ['teinté', 'teinte', 'teinté masse', 'coloré', 'couleur'],
  laque: ['laqué', 'laque', 'Laqué', 'laquable', 'prélaqué'],
  bp: ['bouche pores', 'bouche-pores', 'bp', 'BP'],
  leger: ['léger', 'leger', 'light', 'allégé'],
  cintrable: ['cintrable', 'Cintrable', 'flexible', 'flex'],

  // Contreplaqués
  okoume: ['okoumé', 'okoume', 'Okoumé'],
  bouleau: ['bouleau', 'Bouleau', 'birch'],
  peuplier: ['peuplier', 'Peuplier', 'poplar'],
  maritime: ['maritime', 'Maritime', 'pin maritime'],
  filme: ['filmé', 'filme', 'Filmé', 'coffrage'],
  ctbx: ['ctbx', 'CTBX', 'extérieur'],

  // Agglomérés
  brut: ['brut', 'Brut', 'nu'],
  replaque: ['replaqué', 'replaque', 'Replaqué', 'plaqué'],

  // Mélaminés
  unis: ['unis', 'Unis', 'uni', 'couleur unie'],
  // NOTE: "bois" retiré car trop générique - pour placage c'est redondant,
  // pour mélaminé utiliser "décor bois" ou une essence spécifique (chêne, noyer, etc.)
  decorbois: ['décor bois', 'decor bois', 'imitation bois'],
  fantaisie: ['fantaisie', 'Fantaisie', 'design', 'motif'],

  // Plans de travail
  massif: ['massif', 'Massif', 'solid'],
  stratifie: ['stratifié', 'stratifie', 'HPL'],

  // Marques/Gammes connues
  egger: ['egger', 'Egger', 'EGGER'],
  kronospan: ['kronospan', 'Kronospan'],
  pfleiderer: ['pfleiderer', 'Pfleiderer'],
  unilin: ['unilin', 'Unilin', 'UNILIN'],
  polyrey: ['polyrey', 'Polyrey'],
  formica: ['formica', 'Formica'],
  fenix: ['fenix', 'Fenix', 'FENIX'],
};

// ============================================================================
// INTERFACE RÉSULTAT
// ============================================================================

export interface ParsedSmartQuery {
  productTypes: string[];
  subcategories: string[];    // NEW: standard, hydrofuge, ignifugé, etc.
  woods: string[];
  colors: string[];
  colorQualifiers: string[];
  decors: string[];
  thickness: number | null;
  dimension: { length: number; width: number } | null;  // Dimensions format (ex: 2800x2070)
  searchText: string;
  originalQuery: string;
  recognizedTokens: string[];
  unrecognizedTokens: string[];
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function tokenize(query: string): string[] {
  // Use regex to extract tokens, preserving decimal numbers and accented characters
  const tokens: string[] = [];
  // Match in order of priority:
  // 1. Dimensions: 2800x2070, 2800*2070, 2800×2070
  // 2. Compound words with hyphens (trois-plis, bouche-pores)
  // 3. Number+letter combinations (3plis)
  // 4. Decimal numbers (0.8), integers (19), or number+mm (19mm)
  // 5. Words with accents (\p{L} matches any Unicode letter)
  const regex = /(\d+\s*[xX×*]\s*\d+|[\p{L}\w]+-[\p{L}\w]+(?:-[\p{L}\w]+)?|\d+[\p{L}]+|\d+(?:[.,]\d+)?(?:mm)?|[\p{L}\w]+)/giu;
  let match;
  while ((match = regex.exec(query)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

function parseThickness(token: string): number | null {
  // Only match pure numbers, optionally with "mm" suffix
  // This prevents "3plis" from being parsed as thickness 3mm
  const match = token.match(/^(\d+(?:[.,]\d+)?)(mm)?$/i);
  if (!match) return null;

  const cleaned = match[1].replace(',', '.');
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0 && num <= 100) return num;
  return null;
}

function parseDimension(token: string): { length: number; width: number } | null {
  // Reconnaît les formats: 2800x2070, 2800*2070, 2800×2070, 2800X2070
  const match = token.match(/^(\d+)\s*[xX×*]\s*(\d+)$/);
  if (match) {
    const dim1 = parseInt(match[1], 10);
    const dim2 = parseInt(match[2], 10);
    // Valider que ce sont des dimensions raisonnables (100mm - 5000mm)
    if (dim1 >= 100 && dim1 <= 5000 && dim2 >= 100 && dim2 <= 5000) {
      // Par convention: length = le plus grand, width = le plus petit
      return {
        length: Math.max(dim1, dim2),
        width: Math.min(dim1, dim2),
      };
    }
  }
  return null;
}

function findInDictionary<T>(token: string, dictionary: Record<string, T>): T | null {
  const normalized = normalizeText(token);
  if (dictionary[normalized]) return dictionary[normalized];
  const lowerToken = token.toLowerCase();
  if (dictionary[lowerToken]) return dictionary[lowerToken];
  return null;
}

// ============================================================================
// PARSER PRINCIPAL
// ============================================================================

export function parseSmartQuery(query: string): ParsedSmartQuery {
  const result: ParsedSmartQuery = {
    productTypes: [], subcategories: [], woods: [], colors: [], colorQualifiers: [], decors: [],
    thickness: null, dimension: null, searchText: '', originalQuery: query,
    recognizedTokens: [], unrecognizedTokens: [],
  };

  // Wildcard '*' means "match all" - return empty result (base condition only)
  if (!query || query.trim().length === 0 || query.trim() === '*') return result;

  const tokens = tokenize(query);
  const unrecognized: string[] = [];

  for (const token of tokens) {
    // 0. Dimensions (2800x2070) - vérifier AVANT l'épaisseur car contient des nombres
    const dim = parseDimension(token);
    if (dim !== null) {
      result.dimension = dim;
      result.recognizedTokens.push(`${token} → dimension: ${dim.length}×${dim.width}mm`);
      continue;
    }

    // 1. Épaisseur (nombre)
    const thickness = parseThickness(token);
    if (thickness !== null) {
      result.thickness = thickness;
      result.recognizedTokens.push(`${token} → épaisseur: ${thickness}mm`);
      continue;
    }

    // 2. Type de produit
    const productType = findInDictionary(token, PRODUCT_TYPE_SYNONYMS);
    if (productType && !result.productTypes.includes(productType)) {
      result.productTypes.push(productType);
      result.recognizedTokens.push(`${token} → type: ${productType}`);
      continue;
    }

    // 3. Sous-catégorie / Qualité (standard, hydrofuge, ignifugé...)
    // Store only canonical term to allow multiple distinct subcategories
    const subcategory = findInDictionary(token, SUBCATEGORY_SYNONYMS);
    if (subcategory) {
      const canonical = subcategory[0];
      if (!result.subcategories.includes(canonical)) {
        result.subcategories.push(canonical);
      }
      result.recognizedTokens.push(`${token} → qualité: ${canonical}`);
      continue;
    }

    // 4. Essence de bois - store canonical term only
    const wood = findInDictionary(token, WOOD_SYNONYMS);
    if (wood) {
      const canonical = wood[0];
      if (!result.woods.includes(canonical)) {
        result.woods.push(canonical);
      }
      result.recognizedTokens.push(`${token} → bois: ${canonical}`);
      continue;
    }

    // 5. Couleur - store canonical term only
    const color = findInDictionary(token, COLOR_SYNONYMS);
    if (color) {
      const canonical = color[0];
      if (!result.colors.includes(canonical)) {
        result.colors.push(canonical);
      }
      result.recognizedTokens.push(`${token} → couleur: ${canonical}`);
      continue;
    }

    // 6. Qualificatif couleur - store canonical term only
    const qualifier = findInDictionary(token, COLOR_QUALIFIERS);
    if (qualifier) {
      const canonical = qualifier[0];
      if (!result.colorQualifiers.includes(canonical)) {
        result.colorQualifiers.push(canonical);
      }
      result.recognizedTokens.push(`${token} → qualif: ${canonical}`);
      continue;
    }

    // 7. Décor - store canonical term only
    const decor = findInDictionary(token, DECOR_PATTERNS);
    if (decor) {
      const canonical = decor[0];
      if (!result.decors.includes(canonical)) {
        result.decors.push(canonical);
      }
      result.recognizedTokens.push(`${token} → décor: ${canonical}`);
      continue;
    }

    // Non reconnu
    unrecognized.push(token);
  }

  // Filtrer les mots redondants selon le contexte
  // "bois" est redondant pour les types de produits qui sont intrinsèquement en bois
  const WOOD_INHERENT_TYPES = ['PLACAGE', 'MASSIF', 'CONTREPLAQUE'];
  const isWoodInherentProduct = result.productTypes.some(t => WOOD_INHERENT_TYPES.includes(t));

  const filteredUnrecognized = isWoodInherentProduct
    ? unrecognized.filter(token => token.toLowerCase() !== 'bois')
    : unrecognized;

  result.unrecognizedTokens = filteredUnrecognized;
  result.searchText = filteredUnrecognized.join(' ');
  return result;
}

// ============================================================================
// GÉNÉRATION SQL POUR RECHERCHE
// ============================================================================

export function buildSmartSearchSQL(parsed: ParsedSmartQuery): {
  whereClause: string;
  params: any[];
} {
  // Note: all column references use "p." alias for Panel table
  const whereParts: string[] = ['p."isActive" = true'];
  const params: any[] = [];
  let paramIndex = 1;

  // Cas spécial: Support + Essence (ex: "agglo chêne", "mdf noyer")
  // Ces combinaisons doivent chercher dans le nom car le productType peut être différent
  // Ex: "Aggloméré chêne A/B" a productType=PLACAGE, pas PARTICULE
  const hasWoodOrDecor = parsed.woods.length > 0 || parsed.decors.length > 0;
  const hasProductType = parsed.productTypes.length > 0;

  if (hasProductType && hasWoodOrDecor) {
    // Recherche flexible: productType OU nom contient le matériau
    const productType = parsed.productTypes[0];
    const fullNames = PRODUCT_TYPE_FULL_NAMES[productType] || [];

    // Construire les conditions pour rechercher le nom du matériau dans le nom du panneau
    const nameConditions = fullNames.map(() => {
      const condition = `unaccent(lower(p.name)) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'`;
      paramIndex++;
      return condition;
    });

    // Ajouter les noms au params
    params.push(...fullNames);

    // Condition: productType match OU nom contient le matériau
    if (nameConditions.length > 0) {
      whereParts.push(`(
        p."productType" = $${paramIndex}
        OR ${nameConditions.join(' OR ')}
      )`);
      params.push(productType);
      paramIndex++;
    } else {
      whereParts.push(`p."productType" = $${paramIndex}`);
      params.push(productType);
      paramIndex++;
    }
  } else if (hasProductType) {
    // Type de produit seul (comportement classique)
    whereParts.push(`p."productType" = ANY($${paramIndex})`);
    params.push(parsed.productTypes);
    paramIndex++;
  }

  // Épaisseur
  if (parsed.thickness !== null) {
    whereParts.push(`$${paramIndex} = ANY(p.thickness)`);
    params.push(parsed.thickness);
    paramIndex++;
  }

  // Dimensions (length × width)
  if (parsed.dimension !== null) {
    whereParts.push(`p."defaultLength" = $${paramIndex}`);
    params.push(parsed.dimension.length);
    paramIndex++;
    whereParts.push(`p."defaultWidth" = $${paramIndex}`);
    params.push(parsed.dimension.width);
    paramIndex++;
  }

  // Termes de recherche texte (sous-catégories, couleurs, bois, décors, qualificatifs)
  // Each array now contains only canonical terms, so we use all of them
  const searchTerms: string[] = [];
  // Add ALL subcategories (e.g., "bouleau filmé" → both "bouleau" AND "filmé")
  searchTerms.push(...parsed.subcategories);
  // Add all colors, woods, decors, qualifiers (usually one each, but could be multiple)
  searchTerms.push(...parsed.colors);
  searchTerms.push(...parsed.decors);
  searchTerms.push(...parsed.colorQualifiers);

  // Pour les essences de bois, inclure tous les synonymes (ex: "chêne" → cherche aussi "oak")
  // IMPORTANT: Si on a un terme de recherche non reconnu (ex: "querkus"), l'essence devient optionnelle
  // car les marques n'ont pas forcément l'essence dans le nom (Querkus = chêne implicite)
  const hasUnrecognizedSearchTerm = parsed.searchText && parsed.searchText.length >= 4;

  for (const wood of parsed.woods) {
    const synonyms = WOOD_SYNONYMS[wood] || WOOD_SYNONYMS[wood.toLowerCase()] || [wood];
    const allVariants = [wood, ...synonyms.filter(s => s.toLowerCase() !== wood.toLowerCase())];

    // Construire une condition OR pour tous les synonymes
    // Cherche dans name ET decorName (important pour les marques comme Querkus)
    const woodConditions = allVariants.map(() => {
      const condition = `(
        unaccent(lower(p.name)) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
        OR unaccent(lower(COALESCE(p."decorName", ''))) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
      )`;
      paramIndex++;
      return condition;
    });

    if (woodConditions.length > 0) {
      // Si on a un terme non reconnu (marque/référence), l'essence devient optionnelle
      // Ex: "querkus chêne" → cherche "querkus" sans exiger "chêne" dans le nom
      if (hasUnrecognizedSearchTerm) {
        // Ne pas ajouter la condition essence comme filtre obligatoire
        // L'utilisateur cherche probablement une marque, pas filtrer par essence
        // On réinitialise paramIndex car les conditions ne sont pas utilisées
        paramIndex -= allVariants.length;
      } else {
        whereParts.push(`(${woodConditions.join(' OR ')})`);
        params.push(...allVariants);
      }
    }
  }

  for (const term of searchTerms) {
    whereParts.push(`(
      unaccent(lower(p.name)) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
      OR unaccent(lower(COALESCE(p.finish, ''))) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
      OR unaccent(lower(COALESCE(p.description, ''))) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
    )`);
    params.push(term);
    paramIndex++;
  }

  // Texte restant non reconnu (recherche dans nom, référence, manufacturerRef)
  if (parsed.searchText && parsed.searchText.length >= 2) {
    whereParts.push(`(
      unaccent(lower(p.name)) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
      OR unaccent(lower(COALESCE(p.reference, ''))) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
      OR unaccent(lower(COALESCE(p."manufacturerRef", ''))) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
      OR unaccent(lower(COALESCE(p.description, ''))) ILIKE '%' || unaccent(lower($${paramIndex})) || '%'
    )`);
    params.push(parsed.searchText);
    paramIndex++;
  }

  return { whereClause: whereParts.join(' AND '), params };
}
