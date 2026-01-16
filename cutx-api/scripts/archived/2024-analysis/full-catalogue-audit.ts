import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Problem {
  id: string;
  reference: string;
  name: string;
  issues: string[];
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            AUDIT COMPLET DU CATALOGUE CUTX                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allPanels = await prisma.panel.findMany({
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
      panelSubType: true,
      productCategory: true,
      decorCategory: true,
      decorCode: true,
      decorName: true,
      thickness: true,
      defaultThickness: true,
      pricePerM2: true,
      pricePerMl: true,
      pricePerUnit: true,
      pricePerPanel: true,
      material: true,
      finish: true,
      manufacturer: true,
      reviewStatus: true,
      categoryId: true,
      category: { select: { name: true, slug: true } }
    }
  });

  const total = allPanels.length;
  console.log(`📊 Total produits dans le catalogue: ${total}\n`);

  // ============== 1. STATISTIQUES GLOBALES ==============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1. STATISTIQUES GLOBALES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Par panelType
  const byPanelType: Record<string, number> = {};
  allPanels.forEach(p => {
    const key = p.panelType || 'NULL (non classifié)';
    byPanelType[key] = (byPanelType[key] || 0) + 1;
  });

  console.log('Par panelType:');
  Object.entries(byPanelType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = ((count / total) * 100).toFixed(1);
      console.log(`  ${type.padEnd(20)} ${String(count).padStart(5)} (${pct}%)`);
    });

  // Par decorCategory
  console.log('\nPar decorCategory:');
  const byDecorCategory: Record<string, number> = {};
  allPanels.forEach(p => {
    const key = p.decorCategory || 'NULL';
    byDecorCategory[key] = (byDecorCategory[key] || 0) + 1;
  });
  Object.entries(byDecorCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(20)} ${String(count).padStart(5)}`);
    });

  // Par reviewStatus
  console.log('\nPar reviewStatus:');
  const byReviewStatus: Record<string, number> = {};
  allPanels.forEach(p => {
    const key = p.reviewStatus || 'NULL';
    byReviewStatus[key] = (byReviewStatus[key] || 0) + 1;
  });
  Object.entries(byReviewStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const pct = ((count / total) * 100).toFixed(1);
      console.log(`  ${status.padEnd(20)} ${String(count).padStart(5)} (${pct}%)`);
    });

  // ============== 2. PROBLÈMES DÉTECTÉS ==============
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2. PROBLÈMES DÉTECTÉS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const problems: Problem[] = [];

  for (const panel of allPanels) {
    const issues: string[] = [];

    // 2.1 Type non défini
    if (!panel.panelType) {
      issues.push('❌ panelType non défini');
    }

    // 2.2 Catégorie décor incohérente
    if (panel.panelType === 'CHANT' && panel.decorCategory && panel.decorCategory !== 'SANS_DECOR') {
      // Les chants peuvent avoir un décor, c'est OK
    } else if (panel.panelType === 'AGGLO_BRUT' && panel.decorCategory && panel.decorCategory !== 'SANS_DECOR') {
      issues.push(`⚠️ Agglo brut avec décor (${panel.decorCategory})`);
    } else if (panel.panelType === 'MDF' && panel.panelSubType === 'MDF_BRUT' && panel.decorCategory && panel.decorCategory !== 'SANS_DECOR') {
      issues.push(`⚠️ MDF brut avec décor (${panel.decorCategory})`);
    }

    // 2.3 Prix manquants
    const hasPrice = panel.pricePerM2 || panel.pricePerMl || panel.pricePerUnit || panel.pricePerPanel;
    if (!hasPrice) {
      issues.push('❌ Aucun prix défini');
    }

    // 2.4 Multiple prix (peut être intentionnel mais à vérifier)
    const priceCount = [panel.pricePerM2, panel.pricePerMl, panel.pricePerUnit, panel.pricePerPanel].filter(Boolean).length;
    if (priceCount > 2) {
      issues.push(`⚠️ Multiple prix définis (${priceCount})`);
    }

    // 2.5 Épaisseur incohérente
    if (!panel.thickness || panel.thickness.length === 0) {
      issues.push('❌ Épaisseur non définie');
    }

    // 2.6 Chants avec mauvaise épaisseur
    if (panel.panelType === 'CHANT' && panel.thickness && panel.thickness.some(t => t > 5)) {
      issues.push(`⚠️ Chant avec épaisseur > 5mm (${panel.thickness.join(', ')}mm)`);
    }

    // 2.7 DecorCode sans decorCategory
    if (panel.decorCode && !panel.decorCategory) {
      issues.push('⚠️ decorCode défini mais pas decorCategory');
    }

    // 2.8 Category (DB) non définie
    if (!panel.categoryId) {
      issues.push('⚠️ Pas de catégorie (categoryId null)');
    }

    // 2.9 Détection de types mal classifiés par nom
    const nameLower = (panel.name || '').toLowerCase();
    const refLower = (panel.reference || '').toLowerCase();

    // Chants mal classés
    if ((nameLower.includes('chant') || nameLower.includes('abs ') || nameLower.includes(' abs')) && panel.panelType !== 'CHANT') {
      issues.push(`⚠️ Probablement un chant mais classé comme ${panel.panelType || 'NULL'}`);
    }

    // Stratifiés mal classés
    if ((nameLower.includes('hpl') || nameLower.includes('stratifi')) && panel.panelType !== 'STRATIFIE') {
      if (panel.panelType !== 'COMPACT') { // compact peut contenir HPL
        issues.push(`⚠️ Probablement un stratifié mais classé comme ${panel.panelType || 'NULL'}`);
      }
    }

    // MDF mal classés
    if (nameLower.includes('mdf') && panel.panelType !== 'MDF') {
      if (panel.panelType !== 'MELAMINE' && panel.panelType !== 'PLACAGE') { // MDF mélaminé est MELAMINE
        issues.push(`⚠️ Probablement MDF mais classé comme ${panel.panelType || 'NULL'}`);
      }
    }

    // Contreplaqué mal classés
    if ((nameLower.includes('contreplaq') || nameLower.includes('ctbx') || nameLower.includes('okoumé') || nameLower.includes('okoume')) && panel.panelType !== 'CONTREPLAQUE') {
      issues.push(`⚠️ Probablement contreplaqué mais classé comme ${panel.panelType || 'NULL'}`);
    }

    // Compact mal classés
    if ((nameLower.includes('compact') || nameLower.includes('fundermax') || nameLower.includes('trespa')) && panel.panelType !== 'COMPACT') {
      issues.push(`⚠️ Probablement compact mais classé comme ${panel.panelType || 'NULL'}`);
    }

    if (issues.length > 0) {
      problems.push({
        id: panel.id,
        reference: panel.reference,
        name: panel.name,
        issues
      });
    }
  }

  // Grouper les problèmes par type
  const problemsByType: Record<string, Problem[]> = {};

  for (const p of problems) {
    for (const issue of p.issues) {
      const key = issue.substring(0, 50);
      if (!problemsByType[key]) problemsByType[key] = [];
      problemsByType[key].push(p);
    }
  }

  console.log(`📋 ${problems.length} produits avec au moins un problème (${((problems.length / total) * 100).toFixed(1)}%)\n`);

  // Afficher par catégorie de problème
  const sortedProblems = Object.entries(problemsByType).sort((a, b) => b[1].length - a[1].length);

  for (const [issueType, panels] of sortedProblems) {
    console.log(`\n${issueType} (${panels.length} produits)`);
    console.log('─'.repeat(60));
    panels.slice(0, 5).forEach(p => {
      console.log(`  [${p.reference}] ${p.name.substring(0, 50)}`);
    });
    if (panels.length > 5) {
      console.log(`  ... et ${panels.length - 5} autres`);
    }
  }

  // ============== 3. ANALYSE DES CHANTS ==============
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('3. ANALYSE SPÉCIFIQUE: CHANTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const chants = allPanels.filter(p => p.panelType === 'CHANT');
  console.log(`Total chants: ${chants.length}`);

  const chantsBySubType: Record<string, number> = {};
  chants.forEach(c => {
    const key = c.panelSubType || 'NULL';
    chantsBySubType[key] = (chantsBySubType[key] || 0) + 1;
  });

  console.log('\nPar sous-type:');
  Object.entries(chantsBySubType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)} ${count}`);
    });

  // Chants avec prix au m² (devrait être au ml)
  const chantsM2 = chants.filter(c => c.pricePerM2 && !c.pricePerMl);
  if (chantsM2.length > 0) {
    console.log(`\n⚠️ ${chantsM2.length} chants avec prix au m² (devrait être au ml):`);
    chantsM2.slice(0, 5).forEach(c => {
      console.log(`  [${c.reference}] ${c.name.substring(0, 50)}`);
    });
  }

  // ============== 4. ANALYSE DES MÉLAMINÉS ==============
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4. ANALYSE SPÉCIFIQUE: MÉLAMINÉS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const melamines = allPanels.filter(p => p.panelType === 'MELAMINE');
  console.log(`Total mélaminés: ${melamines.length}`);

  const melByDecor: Record<string, number> = {};
  melamines.forEach(m => {
    const key = m.decorCategory || 'NULL';
    melByDecor[key] = (melByDecor[key] || 0) + 1;
  });

  console.log('\nPar catégorie décor:');
  Object.entries(melByDecor)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(20)} ${count}`);
    });

  // Mélaminés sans décor défini
  const melNoDecor = melamines.filter(m => !m.decorCategory);
  if (melNoDecor.length > 0) {
    console.log(`\n⚠️ ${melNoDecor.length} mélaminés sans decorCategory:`);
    melNoDecor.slice(0, 5).forEach(m => {
      console.log(`  [${m.reference}] ${m.name.substring(0, 50)}`);
    });
  }

  // ============== 5. ANALYSE DES NON CLASSIFIÉS ==============
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('5. ANALYSE DES PRODUITS NON CLASSIFIÉS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const unclassified = allPanels.filter(p => !p.panelType);
  console.log(`Total non classifiés: ${unclassified.length}`);

  if (unclassified.length > 0) {
    // Tenter de deviner le type par le nom
    const guessedTypes: Record<string, Array<{ref: string, name: string}>> = {};

    for (const p of unclassified) {
      const name = (p.name || '').toLowerCase();
      let guessedType = 'INCONNU';

      if (name.includes('chant') || name.includes('abs ') || name.includes(' abs')) {
        guessedType = 'CHANT';
      } else if (name.includes('mélamin') || name.includes('melamin') || name.includes('egger') || name.includes('kronospan')) {
        guessedType = 'MELAMINE';
      } else if (name.includes('stratifi') || name.includes('hpl')) {
        guessedType = 'STRATIFIE';
      } else if (name.includes('compact') || name.includes('fundermax') || name.includes('trespa')) {
        guessedType = 'COMPACT';
      } else if (name.includes('mdf')) {
        guessedType = 'MDF';
      } else if (name.includes('contreplaq') || name.includes('ctbx') || name.includes('okoum')) {
        guessedType = 'CONTREPLAQUE';
      } else if (name.includes('osb')) {
        guessedType = 'OSB';
      } else if (name.includes('agglo') || name.includes('particule')) {
        guessedType = 'AGGLO_BRUT';
      } else if (name.includes('solid surface') || name.includes('corian') || name.includes('krion')) {
        guessedType = 'SOLID_SURFACE';
      } else if (name.includes('placage') || name.includes('plaqué')) {
        guessedType = 'PLACAGE';
      } else if (name.includes('massif') || name.includes('bois massif')) {
        guessedType = 'MASSIF';
      } else if (name.includes('panneau') && (name.includes('3d') || name.includes('déco') || name.includes('frais'))) {
        guessedType = 'PANNEAU_DECO';
      }

      if (!guessedTypes[guessedType]) guessedTypes[guessedType] = [];
      guessedTypes[guessedType].push({ ref: p.reference, name: p.name });
    }

    console.log('\nSuggestions de classification:');
    Object.entries(guessedTypes)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([type, items]) => {
        console.log(`\n  ${type} (${items.length} produits suggérés)`);
        items.slice(0, 3).forEach(i => {
          console.log(`    - [${i.ref}] ${i.name.substring(0, 45)}`);
        });
        if (items.length > 3) {
          console.log(`    ... et ${items.length - 3} autres`);
        }
      });
  }

  // ============== 6. COHÉRENCE DES CATÉGORIES DB ==============
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('6. COHÉRENCE CATÉGORIES DATABASE vs panelType');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const byCategoryDb: Record<string, Record<string, number>> = {};

  for (const p of allPanels) {
    const catName = p.category?.name || 'SANS_CATEGORIE';
    const panelType = p.panelType || 'NULL';

    if (!byCategoryDb[catName]) byCategoryDb[catName] = {};
    byCategoryDb[catName][panelType] = (byCategoryDb[catName][panelType] || 0) + 1;
  }

  for (const [catName, types] of Object.entries(byCategoryDb).sort((a, b) => {
    const totalA = Object.values(a[1]).reduce((s, n) => s + n, 0);
    const totalB = Object.values(b[1]).reduce((s, n) => s + n, 0);
    return totalB - totalA;
  })) {
    const total = Object.values(types).reduce((s, n) => s + n, 0);
    const typesList = Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${t}:${c}`)
      .join(', ');
    console.log(`${catName} (${total}): ${typesList}`);
  }

  // ============== 7. RÉSUMÉ FINAL ==============
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('7. RÉSUMÉ ET RECOMMANDATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const verified = allPanels.filter(p => p.reviewStatus === 'VERIFIE').length;
  const toCorrect = allPanels.filter(p => p.reviewStatus === 'A_CORRIGER').length;
  const notVerified = allPanels.filter(p => p.reviewStatus === 'NON_VERIFIE').length;
  const noType = allPanels.filter(p => !p.panelType).length;
  const noPrice = allPanels.filter(p => !p.pricePerM2 && !p.pricePerMl && !p.pricePerUnit && !p.pricePerPanel).length;
  const noCategory = allPanels.filter(p => !p.categoryId).length;

  console.log('📊 État du catalogue:');
  console.log(`   Total produits:          ${total}`);
  console.log(`   ✅ Vérifiés:             ${verified} (${((verified/total)*100).toFixed(1)}%)`);
  console.log(`   ⚠️  À corriger:          ${toCorrect} (${((toCorrect/total)*100).toFixed(1)}%)`);
  console.log(`   ❓ Non vérifiés:         ${notVerified} (${((notVerified/total)*100).toFixed(1)}%)`);
  console.log('');
  console.log('🔴 Problèmes critiques:');
  console.log(`   Sans panelType:          ${noType}`);
  console.log(`   Sans prix:               ${noPrice}`);
  console.log(`   Sans catégorie DB:       ${noCategory}`);
  console.log('');
  console.log('📝 Recommandations:');

  if (noType > 0) {
    console.log(`   1. PRIORITÉ HAUTE: Classifier les ${noType} produits sans panelType`);
  }
  if (noPrice > 0) {
    console.log(`   2. PRIORITÉ HAUTE: Ajouter les prix aux ${noPrice} produits`);
  }
  if (chantsM2.length > 0) {
    console.log(`   3. Convertir les ${chantsM2.length} chants avec prix/m² en prix/ml`);
  }
  if (melNoDecor.length > 0) {
    console.log(`   4. Définir decorCategory pour les ${melNoDecor.length} mélaminés`);
  }
  if (noCategory > 0) {
    console.log(`   5. Assigner une catégorie aux ${noCategory} produits`);
  }

  console.log('\n✨ Audit terminé!\n');

  await prisma.$disconnect();
}

main().catch(console.error);
