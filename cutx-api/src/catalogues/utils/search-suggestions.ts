/**
 * Search Suggestions Utility
 * Utilise la similarité trigram pour suggérer des corrections de fautes de frappe
 *
 * @example
 * Input: "chataigner" (faute de frappe)
 * Output: { suggestion: "châtaignier", confidence: 0.65 }
 */

import { PrismaService } from '../../prisma/prisma.service';
import {
  WOOD_SYNONYMS,
  COLOR_SYNONYMS,
  PRODUCT_TYPE_SYNONYMS,
} from './smart-search-parser';

// ============================================================================
// MOTS VALIDES - Ne doivent PAS être corrigés
// ============================================================================
// Ces mots sont des termes de recherche valides qui ne sont pas des fautes de frappe
const VALID_SEARCH_TERMS = new Set([
  // Mots génériques de recherche
  'plan', 'travail', 'bois', 'feuille', 'plaque', 'feuilles', 'plaques',
  'panneau', 'panneaux', 'fond', 'dos', 'dessus', 'cote', 'côté',
  // Dimensions et mesures
  'mm', 'cm', 'metre', 'mètre', 'longueur', 'largeur', 'epaisseur', 'épaisseur',
  // Finitions et aspects
  'mat', 'brillant', 'satiné', 'satine', 'lisse', 'texture', 'structuré', 'structure',
  // Usage
  'cuisine', 'salle', 'bain', 'meuble', 'porte', 'facade', 'façade', 'tiroir',
  // Qualificatifs
  'petit', 'grand', 'epais', 'épais', 'fin', 'mince', 'leger', 'léger', 'lourd',
  // Articles et connecteurs (ignorés mais pas corrigés)
  'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'pour', 'avec', 'sans', 'sur',
]);

// ============================================================================
// TERMES COURANTS À CORRIGER
// ============================================================================
// Ces termes sont ajoutés au vocabulaire pour permettre la correction de fautes
const COMMON_TERMS: Record<string, { canonical: string; type: SearchSuggestion['type'] }> = {
  // Panneau et variantes
  'panneau': { canonical: 'panneau', type: 'other' },
  'panneaux': { canonical: 'panneau', type: 'other' },
  // Placage
  'placage': { canonical: 'placage', type: 'productType' },
  // Plan de travail
  'plan': { canonical: 'plan', type: 'other' },
  'travail': { canonical: 'travail', type: 'other' },
};

// Structure pour les suggestions
export interface SearchSuggestion {
  original: string; // Le terme tapé par l'utilisateur
  suggestion: string; // La correction suggérée
  confidence: number; // Score de similarité (0-1)
  type: 'wood' | 'color' | 'productType' | 'manufacturer' | 'other';
}

// Vocabulaire avec ses types
interface VocabEntry {
  canonical: string;
  type: SearchSuggestion['type'];
}

// Cache du vocabulaire pour éviter les requêtes répétées
let vocabularyCache: Map<string, VocabEntry> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

/**
 * Normalise un terme pour la comparaison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Calcul de similarité trigram (Dice coefficient)
 */
function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  // Extraire les trigrammes
  const getTrigrams = (str: string): Set<string> => {
    const trigrams = new Set<string>();
    // Ajouter padding pour les bords
    const padded = `  ${str} `;
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);

  // Compter les trigrammes communs
  let matches = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) matches++;
  }

  // Formule Dice coefficient
  return (2 * matches) / (trigramsA.size + trigramsB.size);
}

/**
 * Construit le vocabulaire de référence depuis les dictionnaires statiques
 * et la base de données
 */
export async function buildVocabulary(
  prisma: PrismaService,
): Promise<Map<string, VocabEntry>> {
  const now = Date.now();

  // Retourner le cache s'il est encore valide
  if (vocabularyCache && now - cacheTimestamp < CACHE_TTL) {
    return vocabularyCache;
  }

  const vocabulary = new Map<string, VocabEntry>();

  // 1. Ajouter les essences de bois (avec leur forme canonique)
  for (const [canonical, variants] of Object.entries(WOOD_SYNONYMS)) {
    vocabulary.set(normalize(canonical), { canonical, type: 'wood' });
    for (const variant of variants) {
      vocabulary.set(normalize(variant), { canonical, type: 'wood' });
    }
  }

  // 2. Ajouter les couleurs
  for (const [canonical, variants] of Object.entries(COLOR_SYNONYMS)) {
    vocabulary.set(normalize(canonical), { canonical, type: 'color' });
    for (const variant of variants) {
      vocabulary.set(normalize(variant), { canonical, type: 'color' });
    }
  }

  // 3. Ajouter les types de produits
  for (const [canonical, variants] of Object.entries(PRODUCT_TYPE_SYNONYMS)) {
    vocabulary.set(normalize(canonical), { canonical, type: 'productType' });
    for (const variant of variants) {
      vocabulary.set(normalize(variant), { canonical, type: 'productType' });
    }
  }

  // 4. Extraire les fabricants uniques de la base
  try {
    const manufacturers = await prisma.panel.groupBy({
      by: ['manufacturer'],
      where: {
        isActive: true,
        manufacturer: { not: null },
      },
    });

    for (const m of manufacturers) {
      if (m.manufacturer) {
        vocabulary.set(normalize(m.manufacturer), {
          canonical: m.manufacturer,
          type: 'manufacturer',
        });
      }
    }
  } catch (error) {
    console.warn('Could not fetch manufacturers for vocabulary:', error);
  }

  // 5. Ajouter les termes courants (panneau, placage, etc.)
  for (const [term, entry] of Object.entries(COMMON_TERMS)) {
    vocabulary.set(normalize(term), entry);
  }

  vocabularyCache = vocabulary;
  cacheTimestamp = now;

  console.log(`Vocabulary built with ${vocabulary.size} terms`);
  return vocabulary;
}

/**
 * Trouve les suggestions pour un terme mal orthographié
 * en utilisant la similarité trigram
 */
export async function findSuggestions(
  prisma: PrismaService,
  query: string,
  minSimilarity: number = 0.3,
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 3) {
    return [];
  }

  const vocabulary = await buildVocabulary(prisma);
  const normalizedQuery = normalize(query);
  const lowerQuery = query.toLowerCase();

  // Si le terme est un mot valide de recherche, pas de suggestion
  // (évite de suggérer "platane" pour "plan")
  if (VALID_SEARCH_TERMS.has(lowerQuery)) {
    return [];
  }

  // Si le terme existe exactement dans le vocabulaire, pas de suggestion nécessaire
  if (vocabulary.has(normalizedQuery)) {
    return [];
  }

  // Calculer la similarité avec tous les termes du vocabulaire
  const candidates: Array<{
    term: string;
    entry: VocabEntry;
    similarity: number;
  }> = [];

  for (const [term, entry] of vocabulary.entries()) {
    // Optimisation: ignorer les termes de longueur très différente
    if (Math.abs(term.length - normalizedQuery.length) > 3) continue;

    const sim = trigramSimilarity(normalizedQuery, term);
    if (sim >= minSimilarity) {
      candidates.push({ term, entry, similarity: sim });
    }
  }

  // Trier par similarité décroissante
  candidates.sort((a, b) => b.similarity - a.similarity);

  // Dédupliquer par suggestion canonique
  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];

  for (const candidate of candidates) {
    const key = candidate.entry.canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      original: query,
      suggestion: candidate.entry.canonical,
      confidence: Math.round(candidate.similarity * 100) / 100,
      type: candidate.entry.type,
    });

    if (suggestions.length >= 5) break;
  }

  return suggestions;
}

/**
 * Analyse une requête complète et suggère des corrections
 * pour chaque mot mal orthographié
 */
export async function analyzeQueryForSuggestions(
  prisma: PrismaService,
  query: string,
): Promise<{
  originalQuery: string;
  suggestions: SearchSuggestion[];
  correctedQuery: string | null;
}> {
  const words = query.trim().split(/\s+/);
  const allSuggestions: SearchSuggestion[] = [];
  const corrections: Map<string, string> = new Map();

  for (const word of words) {
    if (word.length >= 3) {
      const suggestions = await findSuggestions(prisma, word, 0.35);

      // Prendre la meilleure suggestion si confiance >= 0.45
      if (suggestions.length > 0 && suggestions[0].confidence >= 0.45) {
        allSuggestions.push(suggestions[0]);
        corrections.set(word.toLowerCase(), suggestions[0].suggestion);
      }
    }
  }

  // Construire la requête corrigée
  let correctedQuery: string | null = null;
  if (corrections.size > 0) {
    correctedQuery = words
      .map((w) => corrections.get(w.toLowerCase()) || w)
      .join(' ');
  }

  return {
    originalQuery: query,
    suggestions: allSuggestions,
    correctedQuery,
  };
}

/**
 * Vide le cache du vocabulaire (à appeler après mise à jour des panneaux)
 */
export function clearVocabularyCache(): void {
  vocabularyCache = null;
  cacheTimestamp = 0;
}
