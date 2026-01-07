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
};

// ============================================================================
// DICTIONNAIRE - ESSENCES DE BOIS
// ============================================================================

export const WOOD_SYNONYMS: Record<string, string[]> = {
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
  teck: ['teck', 'Teck', 'teak'],
  wenge: ['wengé', 'Wengé', 'wenge'],
  acacia: ['acacia', 'Acacia'],
  olivier: ['olivier', 'Olivier', 'olive'],
  orme: ['orme', 'Orme', 'elm'],
  zebrano: ['zébrano', 'Zebrano'],
  palissandre: ['palissandre', 'Palissandre', 'rosewood'],
};

// ============================================================================
// DICTIONNAIRE - COULEURS
// ============================================================================

export const COLOR_SYNONYMS: Record<string, string[]> = {
  // Blancs
  blanc: ['blanc', 'Blanc', 'white', 'bianco'], white: ['blanc', 'white'],
  creme: ['crème', 'Crème', 'cream', 'ivoire'], ivoire: ['ivoire', 'Ivoire'],
  // Gris
  gris: ['gris', 'Gris', 'grey', 'gray', 'grigio'],
  anthracite: ['anthracite', 'Anthracite'], ardoise: ['ardoise', 'Ardoise', 'slate'],
  taupe: ['taupe', 'Taupe'], graphite: ['graphite', 'Graphite'],
  // Noirs
  noir: ['noir', 'Noir', 'black', 'nero'], black: ['noir', 'black'],
  // Beiges / Marrons
  beige: ['beige', 'Beige', 'sable'], sable: ['sable', 'Sable', 'sand'],
  marron: ['marron', 'Marron', 'brown', 'brun'], brun: ['brun', 'Brun', 'brown'],
  caramel: ['caramel', 'Caramel'], chocolat: ['chocolat', 'Chocolat'],
  cafe: ['café', 'Café', 'coffee'], cappuccino: ['cappuccino', 'Cappuccino'],
  // Bleus
  bleu: ['bleu', 'Bleu', 'blue'], blue: ['bleu', 'blue'],
  navy: ['navy', 'bleu marine'], marine: ['marine', 'navy'],
  turquoise: ['turquoise', 'Turquoise'],
  // Verts
  vert: ['vert', 'Vert', 'green'], green: ['vert', 'green'],
  olive: ['olive', 'Olive'], sauge: ['sauge', 'Sauge', 'sage'],
  // Rouges / Roses
  rouge: ['rouge', 'Rouge', 'red'], bordeaux: ['bordeaux', 'Bordeaux'],
  rose: ['rose', 'Rose', 'pink'], corail: ['corail', 'Corail'],
  // Jaunes / Oranges
  jaune: ['jaune', 'Jaune', 'yellow'], orange: ['orange', 'Orange'],
  curry: ['curry', 'Curry', 'moutarde'], moutarde: ['moutarde', 'Moutarde'],
  // Métalliques
  cuivre: ['cuivre', 'Cuivre', 'copper'], or: ['or', 'Or', 'gold', 'doré'],
  dore: ['doré', 'Doré', 'gold'], argent: ['argent', 'Argent', 'silver'],
  chrome: ['chrome', 'Chrome'], inox: ['inox', 'Inox'],
  alu: ['aluminium', 'Aluminium', 'alu'], aluminium: ['aluminium', 'Aluminium'],
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
  bois: ['bois', 'Bois', 'décor bois', 'wood'],
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
  // 2. Decimal numbers (0.8), integers (19), or number+mm (19mm)
  // 3. Words with accents (\p{L} matches any Unicode letter)
  const regex = /(\d+\s*[xX×*]\s*\d+|\d+(?:[.,]\d+)?(?:mm)?|[\p{L}\w]+)/giu;
  let match;
  while ((match = regex.exec(query)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

function parseThickness(token: string): number | null {
  const cleaned = token.replace(/mm$/i, '').replace(',', '.');
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

  if (!query || query.trim().length === 0) return result;

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

  result.unrecognizedTokens = unrecognized;
  result.searchText = unrecognized.join(' ');
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

  // Type de produit
  if (parsed.productTypes.length > 0) {
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
  searchTerms.push(...parsed.woods);
  searchTerms.push(...parsed.decors);
  searchTerms.push(...parsed.colorQualifiers);

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
