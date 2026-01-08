import type { ClassificationResult } from '../types/ai-types';

/**
 * Classifies a query to determine if it needs AI assistance
 * or can be handled by the regular smart-search
 */
export function classifyQuery(query: string): ClassificationResult {
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);

  // Simple search patterns (use existing smart-search)
  const simplePatterns = [
    /^(mdf|méla|mélamine|agglo|strat|stratifié|osb|cp|chant|compact)\s*\d*\s*(mm)?$/i,
    /^(blanc|gris|chêne|noyer|noir|beige|anthracite)\s*\d*$/i,
    /^\d+\s*(mm|x\d+)?$/i,
    /^[A-Z0-9]{3,20}$/i, // Reference codes
  ];

  if (simplePatterns.some((p) => p.test(normalizedQuery))) {
    return {
      needsAI: false,
      confidence: 0.95,
      reason: 'simple_product_search',
    };
  }

  // Very short queries (1-2 words) → simple search
  if (words.length <= 2 && normalizedQuery.length < 20) {
    return {
      needsAI: false,
      confidence: 0.85,
      reason: 'simple_product_search',
    };
  }

  // Complex indicators requiring AI
  const complexIndicators = {
    projectDescription: [
      /je\s+(veux|cherche|voudrais|souhaite|recherche|ai\s+besoin)/i,
      /pour\s+(un|une|mon|ma|le|la|créer|faire|fabriquer)/i,
      /projet\s+de/i,
      /comment\s+(faire|choisir|trouver)/i,
    ],
    quantityRequest: [
      /\d+\s*panneaux?/i,
      /\d+\s*débits?/i,
      /\d+\s*pièces?/i,
      /\d+\s*éléments?/i,
      /\d+\s*plaques?/i,
    ],
    recommendationRequest: [
      /quel\s+(panneau|type|matériau)/i,
      /recommand/i,
      /meilleur\s+(choix|option|panneau)/i,
      /adapté\s+(pour|à)/i,
      /conseill/i,
      /que\s+me\s+propos/i,
      /qu'?est[- ]ce\s+que/i,
    ],
    roomContext: [
      /salle\s+de\s+bain/i,
      /cuisine/i,
      /extérieur/i,
      /humide/i,
      /meuble/i,
      /placard/i,
      /dressing/i,
      /bibliothèque/i,
      /bureau/i,
      /étagère/i,
      /caisson/i,
      /façade/i,
      /plan\s+de\s+travail/i,
      /vasque/i,
    ],
    question: [
      /\?$/,
      /^(quel|quelle|quels|quelles|comment|pourquoi|est[- ]ce|puis[- ]je)/i,
    ],
    edgeBandRequest: [
      /chant[s]?\s+(plaqué|assorti|partout|sur\s+tout)/i,
      /plaquer\s+(les\s+)?chant/i,
      /bande[s]?\s+de\s+chant/i,
    ],
    finishRequest: [
      /vernis/i,
      /laqué/i,
      /teint/i,
      /finition/i,
    ],
  };

  // Score complexity
  let score = 0;
  let primaryReason: ClassificationResult['reason'] = 'project_description';
  const matchedCategories: string[] = [];

  for (const [reason, patterns] of Object.entries(complexIndicators)) {
    const matches = patterns.filter((p) => p.test(normalizedQuery)).length;
    if (matches > 0) {
      score += matches * 0.25;
      matchedCategories.push(reason);
      if (matches >= 2) {
        primaryReason = reason as ClassificationResult['reason'];
      }
    }
  }

  // Length-based complexity boost
  if (normalizedQuery.length > 80) score += 0.15;
  if (normalizedQuery.length > 150) score += 0.15;
  if (words.length > 10) score += 0.1;
  if (words.length > 20) score += 0.1;

  // Multiple dimensions mentioned → likely a project
  const dimensionMatches = normalizedQuery.match(/\d+\s*(x|par|×)\s*\d+/gi);
  if (dimensionMatches && dimensionMatches.length >= 2) {
    score += 0.3;
    primaryReason = 'complex_quantity';
  }

  // Question mark at the end
  if (normalizedQuery.endsWith('?')) {
    score += 0.2;
    primaryReason = 'question';
  }

  // Cap confidence at 1
  const confidence = Math.min(score, 1);

  return {
    needsAI: confidence >= 0.35,
    confidence,
    reason: primaryReason,
    extractedIntent: matchedCategories.length > 0 ? matchedCategories.join(', ') : undefined,
  };
}
