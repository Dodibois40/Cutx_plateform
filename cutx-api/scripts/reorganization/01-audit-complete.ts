/**
 * 01-audit-complete.ts
 * Audit complet de TOUS les panneaux pour détecter les problèmes de classification
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Règles de détection des anomalies
const MISCLASSIFICATION_RULES = {
  MDF: {
    shouldNotContain: ['mélamine', 'melamine', 'stratifié', 'stratifie'],
    subcategories: {
      'mdf-hydrofuge': ['hydrofuge', 'hydro', 'ctbh', 'p5'],
      'mdf-ignifuge': ['ignifuge', 'm1', 'b-s', 'classement'],
      'mdf-a-laquer': ['lac', 'laquer', 'e-z', 'fibralac', 'fibraplast', 'bouche pores', 'bouche-pores'],
      'mdf-teinte-couleurs': ['teinté', 'teinte', 'colour', 'color', 'fibracolour', 'noir', 'couleur'],
      'mdf-cintrable': ['cintrable', 'flexible', 'flex'],
      'mdf-leger': ['léger', 'leger', 'light', 'ultralight'],
    }
  },
  MELAMINE: {
    categories: {
      'unis-blanc': ['blanc', 'white', 'w1100', 'w980', 'magnolia', 'alpinweiss'],
      'unis-noir': ['noir', 'black', 'u999', 'graphite'],
      'unis-gris': ['gris', 'grey', 'anthracite', 'taupe'],
      'decors-bois': ['chêne', 'chene', 'noyer', 'hêtre', 'hetre', 'frêne', 'frene', 'érable', 'erable', 'teck', 'wenge', 'acacia', 'orme', 'merisier', 'cerisier', 'bouleau', 'oak', 'walnut'],
      'decors-pierre-beton': ['marbre', 'béton', 'beton', 'pierre', 'ardoise', 'granite', 'terrazzo', 'travertin'],
      'decors-metal': ['aluminium', 'inox', 'acier', 'cuivre', 'laiton', 'bronze', 'métal', 'metal', 'chrome'],
      'fenix': ['fenix'],
    }
  },
  CONTREPLAQUE: {
    categories: {
      'cp-marine-ctbx': ['marine', 'ctbx', 'bakélisé', 'bakelise'],
      'cp-okoume': ['okoumé', 'okoume'],
      'cp-peuplier': ['peuplier', 'poplar'],
      'cp-bouleau': ['bouleau', 'birch'],
      'cp-filme': ['filmé', 'filme', 'coffrage'],
      'cp-cintrable': ['cintrable', 'flexible'],
      'cp-antiderapant': ['antidérapant', 'antiderapant', 'anti-dérapant'],
      'cp-pin-maritime': ['pin maritime', 'pin sylvestre'],
      'cp-exotique': ['sipo', 'sapelli', 'ilomba', 'exotique'],
    }
  },
  PARTICULE: {
    categories: {
      'agglo-hydrofuge': ['hydrofuge', 'p5', 'ctbh', 'hydro'],
      'agglo-ignifuge': ['ignifuge', 'm1'],
      'agglo-rainure': ['rainuré', 'rainure', 'dalle'],
    }
  }
};

interface Issue {
  reference: string;
  name: string;
  currentCategory: string | null;
  currentProductType: string | null;
  issue: string;
  suggestedCategory?: string;
  suggestedProductType?: string;
}

interface AuditResult {
  productType: string;
  total: number;
  byCategory: Record<string, number>;
  issues: Issue[];
}

async function auditProductType(productType: string): Promise<AuditResult> {
  const panels = await prisma.panel.findMany({
    where: { productType },
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { reference: 'asc' }
  });

  const byCategory: Record<string, number> = {};
  const issues: Issue[] = [];

  for (const panel of panels) {
    const catSlug = panel.category?.slug || 'AUCUNE';
    byCategory[catSlug] = (byCategory[catSlug] || 0) + 1;

    const nameLower = (panel.name || '').toLowerCase();

    // Vérifier les règles spécifiques au productType
    if (productType === 'MDF') {
      // Vérifier si c'est vraiment un MDF ou un MELAMINE mal classé
      for (const term of MISCLASSIFICATION_RULES.MDF.shouldNotContain) {
        if (nameLower.includes(term)) {
          issues.push({
            reference: panel.reference,
            name: panel.name || '',
            currentCategory: panel.category?.slug || null,
            currentProductType: productType,
            issue: `SHOULD_NOT_BE_MDF`,
            suggestedProductType: term.includes('mélamine') || term.includes('melamine') ? 'MELAMINE' : 'STRATIFIE'
          });
          break;
        }
      }

      // Vérifier la sous-catégorie
      if (!issues.find(i => i.reference === panel.reference)) {
        for (const [targetCat, keywords] of Object.entries(MISCLASSIFICATION_RULES.MDF.subcategories)) {
          for (const keyword of keywords) {
            if (nameLower.includes(keyword) && panel.category?.slug !== targetCat) {
              issues.push({
                reference: panel.reference,
                name: panel.name || '',
                currentCategory: panel.category?.slug || null,
                currentProductType: productType,
                issue: `WRONG_SUBCATEGORY`,
                suggestedCategory: targetCat
              });
              break;
            }
          }
          if (issues.find(i => i.reference === panel.reference && i.issue === 'WRONG_SUBCATEGORY')) break;
        }
      }
    }

    // Vérifier MELAMINE
    if (productType === 'MELAMINE') {
      let foundCategory = false;
      for (const [targetCat, keywords] of Object.entries(MISCLASSIFICATION_RULES.MELAMINE.categories)) {
        for (const keyword of keywords) {
          if (nameLower.includes(keyword)) {
            foundCategory = true;
            if (panel.category?.slug !== targetCat && !panel.category?.slug?.startsWith(targetCat.split('-')[0])) {
              // Ne pas flaguer si déjà dans une catégorie similaire
              const currentCatBase = panel.category?.slug?.split('-')[0] || '';
              const targetCatBase = targetCat.split('-')[0];
              if (currentCatBase !== targetCatBase && currentCatBase !== 'decors') {
                issues.push({
                  reference: panel.reference,
                  name: panel.name || '',
                  currentCategory: panel.category?.slug || null,
                  currentProductType: productType,
                  issue: `WRONG_MELAMINE_CATEGORY`,
                  suggestedCategory: targetCat
                });
              }
            }
            break;
          }
        }
        if (foundCategory) break;
      }
    }

    // Vérifier CONTREPLAQUE
    if (productType === 'CONTREPLAQUE') {
      for (const [targetCat, keywords] of Object.entries(MISCLASSIFICATION_RULES.CONTREPLAQUE.categories)) {
        for (const keyword of keywords) {
          if (nameLower.includes(keyword) && panel.category?.slug !== targetCat) {
            issues.push({
              reference: panel.reference,
              name: panel.name || '',
              currentCategory: panel.category?.slug || null,
              currentProductType: productType,
              issue: `WRONG_CP_CATEGORY`,
              suggestedCategory: targetCat
            });
            break;
          }
        }
        if (issues.find(i => i.reference === panel.reference && i.issue === 'WRONG_CP_CATEGORY')) break;
      }
    }

    // Vérifier PARTICULE
    if (productType === 'PARTICULE') {
      for (const [targetCat, keywords] of Object.entries(MISCLASSIFICATION_RULES.PARTICULE.categories)) {
        for (const keyword of keywords) {
          if (nameLower.includes(keyword) && panel.category?.slug !== targetCat) {
            issues.push({
              reference: panel.reference,
              name: panel.name || '',
              currentCategory: panel.category?.slug || null,
              currentProductType: productType,
              issue: `WRONG_AGGLO_CATEGORY`,
              suggestedCategory: targetCat
            });
            break;
          }
        }
        if (issues.find(i => i.reference === panel.reference && i.issue === 'WRONG_AGGLO_CATEGORY')) break;
      }
    }
  }

  // Dédupliquer les issues
  const uniqueIssues = issues.filter((issue, index, self) =>
    index === self.findIndex(i => i.reference === issue.reference)
  );

  return {
    productType,
    total: panels.length,
    byCategory,
    issues: uniqueIssues
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         AUDIT COMPLET DES CLASSIFICATIONS DE PANNEAUX           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 1. Statistiques globales
  const totalPanels = await prisma.panel.count({ where: { isActive: true } });
  const panelsWithoutCategory = await prisma.panel.count({ where: { isActive: true, categoryId: null } });
  const panelsWithoutType = await prisma.panel.count({ where: { isActive: true, productType: null } });

  console.log('═══ STATISTIQUES GLOBALES ═══');
  console.log(`Total panneaux actifs: ${totalPanels}`);
  console.log(`Sans catégorie: ${panelsWithoutCategory}`);
  console.log(`Sans productType: ${panelsWithoutType}`);
  console.log('');

  // 2. Distribution par productType
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  console.log('═══ DISTRIBUTION PAR PRODUCTTYPE ═══');
  for (const t of byType) {
    const pct = ((t._count / totalPanels) * 100).toFixed(1);
    console.log(`  ${(t.productType || 'NULL').padEnd(20)} ${String(t._count).padStart(5)} (${pct}%)`);
  }
  console.log('');

  // 3. Audit détaillé par type
  const typesToAudit = ['MDF', 'MELAMINE', 'CONTREPLAQUE', 'PARTICULE', 'OSB', 'STRATIFIE', 'PANNEAU_MASSIF'];

  console.log('═══ AUDIT DÉTAILLÉ PAR TYPE ═══\n');

  const fullReport: Record<string, AuditResult> = {};
  let totalIssues = 0;

  for (const type of typesToAudit) {
    const result = await auditProductType(type);
    fullReport[type] = result;
    totalIssues += result.issues.length;

    console.log(`\n┌─── ${type} (${result.total} panneaux) ───`);

    // Distribution par catégorie
    console.log('│ Catégories:');
    const sortedCats = Object.entries(result.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [cat, count] of sortedCats) {
      console.log(`│   ${cat.padEnd(25)} ${count}`);
    }

    // Issues
    if (result.issues.length > 0) {
      console.log(`│`);
      console.log(`│ ⚠️  PROBLÈMES DÉTECTÉS: ${result.issues.length}`);

      // Grouper par type d'issue
      const issuesByType: Record<string, Issue[]> = {};
      for (const issue of result.issues) {
        if (!issuesByType[issue.issue]) issuesByType[issue.issue] = [];
        issuesByType[issue.issue].push(issue);
      }

      for (const [issueType, issues] of Object.entries(issuesByType)) {
        console.log(`│   ${issueType}: ${issues.length}`);
        // Afficher les 5 premiers exemples
        for (const issue of issues.slice(0, 5)) {
          console.log(`│     • ${issue.reference} | ${issue.name.substring(0, 40)}...`);
          if (issue.suggestedCategory) {
            console.log(`│       → Suggéré: ${issue.suggestedCategory}`);
          }
          if (issue.suggestedProductType) {
            console.log(`│       → Type: ${issue.suggestedProductType}`);
          }
        }
        if (issues.length > 5) {
          console.log(`│     ... et ${issues.length - 5} autres`);
        }
      }
    } else {
      console.log(`│ ✅ Aucun problème détecté`);
    }

    console.log(`└${'─'.repeat(50)}`);
  }

  // 4. Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ FINAL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal problèmes détectés: ${totalIssues}`);

  for (const [type, result] of Object.entries(fullReport)) {
    if (result.issues.length > 0) {
      console.log(`  ${type}: ${result.issues.length} problèmes`);
    }
  }

  // 5. Sauvegarder le rapport JSON
  const fs = await import('fs');
  const reportPath = './scripts/reorganization/audit-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(console.error);
