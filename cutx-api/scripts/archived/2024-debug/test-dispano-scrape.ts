/**
 * Test scraping Dispano - Panneaux Mélaminés
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur dispano.fr avec son compte
 * 3. Lancer: npx tsx scripts/test-dispano-scrape.ts
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://www.dispano.fr/p/panneaux-decoratifs/panneau-de-particule-e1-surface-melamine-blanc-front-white-u501-pe-u501-pe-format-280x207cm-en-19mm-A7581994';

async function main() {
  console.log('🔧 TEST SCRAPING DISPANO');
  console.log('========================\n');

  // Connexion au navigateur Chrome
  console.log('🔌 Connexion à Chrome...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez d\'abord Chrome en mode debug!');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté à Chrome!\n');

  // Aller sur la page produit
  console.log(`📄 Chargement de: ${TEST_URL}\n`);

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('⚠️ Timeout de navigation, on continue...');
  }

  await new Promise((r) => setTimeout(r, 3000));

  // Scroll vers le bas pour charger les sections caractéristiques
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await new Promise((r) => setTimeout(r, 2000));

  // Debug: Vérifier l'URL actuelle
  const currentUrl = page.url();
  console.log('📍 URL actuelle:', currentUrl);

  // Debug: Vérifier le titre de la page
  const pageTitle = await page.title();
  console.log('📄 Titre page:', pageTitle);

  // Debug: Prendre un aperçu du HTML
  const htmlPreview = await page.evaluate(() => {
    return {
      bodyLength: document.body.innerHTML.length,
      h1Count: document.querySelectorAll('h1').length,
      h1Text: document.querySelector('h1')?.textContent?.trim() || 'Aucun H1',
      hasLogin: document.body.innerText.includes('Connexion') || document.body.innerText.includes('Se connecter'),
      first500chars: document.body.innerText.substring(0, 500)
    };
  });

  console.log('📊 Body length:', htmlPreview.bodyLength, 'chars');
  console.log('📊 H1 count:', htmlPreview.h1Count);
  console.log('📊 H1 text:', htmlPreview.h1Text);
  console.log('📊 Login needed:', htmlPreview.hasLogin);
  console.log('📊 First 500 chars:', htmlPreview.first500chars.substring(0, 200), '...');
  console.log('');

  // Extraire les données
  console.log('🔍 Extraction des données...\n');

  const data = await page.evaluate(() => {
    const result: Record<string, any> = {};

    // === NOM DU PRODUIT ===
    const titleEl = document.querySelector('[data-testid="article-header/article-name"], h1');
    result.nom = titleEl?.textContent?.trim() || '';

    // === MARQUE ===
    // Extraire du titre de la page "SWISS KRONO - Mélaminé..."
    const pageTitle = document.title;
    const titleBrandMatch = pageTitle.match(/^([A-Z\s]+)\s*-\s*/);
    if (titleBrandMatch) {
      result.marque = titleBrandMatch[1].trim();
    }

    // Si pas trouvé, chercher dans le texte
    if (!result.marque || result.marque === 'Marques') {
      const pageText = document.body.innerText;
      const brands = ['SWISS KRONO', 'EGGER', 'KRONOSPAN', 'FINSA', 'PFLEIDERER', 'UNILIN', 'POLYREY', 'ABET LAMINATI'];
      for (const brand of brands) {
        if (pageText.toUpperCase().includes(brand)) {
          result.marque = brand;
          break;
        }
      }
    }

    // === PRIX ===
    // Chercher le prix "Mon prix" en €/m²
    const allText = document.body.innerText;
    const prixMatch = allText.match(/([\d,]+)\s*€\s*HT\s*\/\s*[Mm][èe]tre\s*carr[ée]/);
    result.prixM2 = prixMatch ? parseFloat(prixMatch[1].replace(',', '.')) : null;

    // Prix public aussi
    const prixPublicMatch = allText.match(/Prix\s*public\s*([\d,]+)\s*€/i);
    result.prixPublic = prixPublicMatch ? parseFloat(prixPublicMatch[1].replace(',', '.')) : null;

    result.prixText = prixMatch ? prixMatch[0] : '';

    // === RÉFÉRENCES ===
    // Chercher les références dans le texte de la page
    const pageText = document.body.innerText;

    // Réf. Dispano
    const refDispanoMatch = pageText.match(/R[ée]f\.?\s*Dispano\s*:?\s*(\d+)/i);
    result.refDispano = refDispanoMatch ? refDispanoMatch[1] : null;

    // Code EAN
    const eanMatch = pageText.match(/Code\s*EAN\s*:?\s*(\d+)/i);
    result.codeEAN = eanMatch ? eanMatch[1] : null;

    // Réf. Marque (Swiss Krono, Egger, etc.) - chercher après le nom de marque
    const refSwissKronoMatch = pageText.match(/R[ée]f\.?\s*SWISS\s*KRONO\s*:?\s*(\d+)/i);
    const refEggerMatch = pageText.match(/R[ée]f\.?\s*EGGER\s*:?\s*(\d+)/i);
    const refKronospanMatch = pageText.match(/R[ée]f\.?\s*KRONOSPAN\s*:?\s*(\d+)/i);
    result.refMarque = refSwissKronoMatch?.[1] || refEggerMatch?.[1] || refKronospanMatch?.[1] || null;

    // === CARACTÉRISTIQUES TECHNIQUES ===
    // Les caractéristiques sont dans des sections avec des tables
    const specs: Record<string, string> = {};

    // Méthode 1: Parser les tableaux de caractéristiques
    document.querySelectorAll('table').forEach((table, tableIndex) => {
      table.querySelectorAll('tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const label = cells[0]?.textContent?.trim() || '';
          const value = cells[1]?.textContent?.trim() || '';
          if (label && value && label.length < 60 && value.length < 200) {
            specs[label] = value;
          }
        }
      });
    });

    // Méthode 2: Chercher les lignes de type "Label\tValue" ou "Label Value"
    // Les specs Dispano sont souvent dans des divs structurés
    document.querySelectorAll('[class*="row"], [class*="item"], [class*="line"]').forEach((el) => {
      const children = el.children;
      if (children.length >= 2) {
        const label = children[0]?.textContent?.trim() || '';
        const value = children[1]?.textContent?.trim() || '';
        if (label && value && label.length < 50 && !specs[label]) {
          specs[label] = value;
        }
      }
    });

    // Méthode 3: Regex sur le texte de la page pour les specs connues
    const knownSpecs = [
      'Matière', 'Teinte', 'Type de produit', 'Gamme', 'Classe de feu',
      'Finition/Structure', 'FinitionStructure', 'Classe de service',
      'Ignifuge (Euroclasse)', 'Film de protection', 'Référence Décor',
      'Nom Décor', '2 Faces décor identique', 'Support', 'Classement particules',
      'Emission formaldéhyde', 'Code douane SH8', 'Type de bois',
      'Longueur', 'Largeur', 'Epaisseur', 'Poids net',
      'Type de FDES ou PEP', 'Réchauffement climatique'
    ];

    for (const spec of knownSpecs) {
      if (!specs[spec]) {
        const regex = new RegExp(spec.replace(/[()]/g, '\\$&') + '\\s*([\\w\\s\\-,\\.]+)', 'i');
        const match = pageText.match(regex);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value.length > 0 && value.length < 100) {
            specs[spec] = value;
          }
        }
      }
    }

    result.specs = specs;
    result.specsCount = Object.keys(specs).length;

    // Extraire les specs importantes directement
    result.teinte = specs['Teinte'] || null;
    result.matiere = specs['Matière'] || null;
    result.gamme = specs['Gamme'] || null;
    result.finitionStructure = specs['Finition/Structure'] || specs['FinitionStructure'] || null;
    result.classementParticules = specs['Classement particules'] || null;
    result.emissionFormaldehyde = specs['Emission formaldéhyde'] || specs['Émission formaldéhyde'] || null;
    result.nomDecorSpec = specs['Nom Décor'] || specs['Nom décor'] || null;
    result.refDecorSpec = specs['Référence Décor'] || specs['Référence décor'] || null;
    result.supportSpec = specs['Support'] || null;
    result.deuxFacesIdentiques = specs['2 Faces décor identique'] || null;
    result.ignifuge = specs['Ignifuge (Euroclasse)'] || null;
    result.typeBois = specs['Type de bois'] || null;

    // === DIMENSIONS ===
    // Chercher longueur, largeur, épaisseur
    const longueurMatch = pageText.match(/Longueur\s*:?\s*(\d+)\s*mm/i);
    result.longueur = longueurMatch ? parseInt(longueurMatch[1]) : null;

    const largeurMatch = pageText.match(/Largeur\s*:?\s*(\d+)\s*mm/i);
    result.largeur = largeurMatch ? parseInt(largeurMatch[1]) : null;

    const epaisseurMatch = pageText.match(/[EÉ]paisseur\s*:?\s*(\d+)\s*mm/i);
    result.epaisseur = epaisseurMatch ? parseInt(epaisseurMatch[1]) : null;

    // === POIDS ===
    const poidsMatch = pageText.match(/Poids\s*(?:net)?\s*:?\s*([\d,\.]+)\s*kg/i);
    result.poids = poidsMatch ? parseFloat(poidsMatch[1].replace(',', '.')) : null;

    // === CLASSE FEU ===
    const classeFeuMatch = pageText.match(/Classe\s*(?:de\s*)?feu\s*:?\s*([A-Z0-9\-\s]+)/i);
    result.classeFeu = classeFeuMatch ? classeFeuMatch[1].trim() : null;

    const euroClasseMatch = pageText.match(/(?:Euro)?[Cc]lasse\s*:?\s*([A-E][0-9]?(?:\s*-\s*s[0-9],?\s*d[0-9])?)/i);
    result.euroClasse = euroClasseMatch ? euroClasseMatch[1].trim() : null;

    // === DONNÉES CARBONE ===
    // Chercher "Réchauffement climatique kg équiv CO2 par UF: 2.26"
    const co2Match = pageText.match(/R[ée]chauffement\s*climatique[^:]*:\s*([\d,\.]+)/i);
    result.co2 = co2Match ? parseFloat(co2Match[1].replace(',', '.')) : null;

    // Alternative: "équiv CO2"
    if (!result.co2) {
      const co2Match2 = pageText.match(/[ée]quiv\.?\s*CO2[^:]*:\s*([\d,\.]+)/i);
      result.co2 = co2Match2 ? parseFloat(co2Match2[1].replace(',', '.')) : null;
    }

    // === TYPE DE PRODUIT ===
    const typeProduitMatch = pageText.match(/Type\s*de\s*produit\s*:?\s*([^\n]+)/i);
    result.typeProduit = typeProduitMatch ? typeProduitMatch[1].trim() : null;

    // === DÉCOR ===
    const decorMatch = pageText.match(/(?:Nom\s*)?[Dd][ée]cor\s*:?\s*([^\n]+)/i);
    result.decor = decorMatch ? decorMatch[1].trim() : null;

    const refDecorMatch = pageText.match(/R[ée]f[ée]rence\s*[Dd][ée]cor\s*:?\s*([^\n]+)/i);
    result.refDecor = refDecorMatch ? refDecorMatch[1].trim() : null;

    // === SUPPORT ===
    const supportMatch = pageText.match(/Support\s*:?\s*([^\n]+)/i);
    result.support = supportMatch ? supportMatch[1].trim() : null;

    // === IMAGE ===
    // Chercher l'image produit dans différents sélecteurs
    const imgSelectors = [
      '[data-testid*="image"] img',
      '.product-image img',
      '.gallery img',
      'img[src*="dispano"]',
      'img[src*="product"]',
      'picture img',
      '.swiper img',
      'img[alt*="Mélaminé"]',
      'img[alt*="panneau"]'
    ];

    let imageUrl = null;
    for (const sel of imgSelectors) {
      const img = document.querySelector(sel) as HTMLImageElement;
      if (img) {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0];
        if (src && !src.includes('placeholder') && !src.includes('data:image')) {
          imageUrl = src;
          break;
        }
      }
    }
    result.imageUrl = imageUrl;

    // Aussi chercher dans og:image
    if (!result.imageUrl) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        result.imageUrl = ogImage.getAttribute('content');
      }
    }

    // === STRUCTURE HTML (pour debug) ===
    result.htmlStructure = {
      h1: document.querySelector('h1')?.outerHTML?.substring(0, 200),
      prices: Array.from(document.querySelectorAll('[class*="price"]')).slice(0, 3).map(el => ({
        class: el.className,
        text: el.textContent?.trim().substring(0, 100)
      })),
      tables: document.querySelectorAll('table').length,
      dls: document.querySelectorAll('dl').length,
    };

    return result;
  });

  // Afficher les résultats
  console.log('═══════════════════════════════════════════════════════');
  console.log('📦 DONNÉES EXTRAITES DU PRODUIT');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🏷️  NOM:', data.nom || '❌ Non trouvé');
  console.log('🏭 MARQUE:', data.marque || '❌ Non trouvé');
  console.log('');

  console.log('📋 RÉFÉRENCES:');
  console.log('   Réf. Dispano:', data.refDispano || '❌ Non trouvé');
  console.log('   Code EAN:', data.codeEAN || '❌ Non trouvé');
  console.log('   Réf. Marque:', data.refMarque || '❌ Non trouvé');
  console.log('');

  console.log('💰 PRIX:', data.prixM2 ? `${data.prixM2} €/m²` : '❌ Non trouvé');
  console.log('   Prix public:', data.prixPublic ? `${data.prixPublic} €/m²` : 'N/A');
  console.log('   (texte brut:', data.prixText || 'N/A', ')');
  console.log('');

  console.log('📐 DIMENSIONS:');
  console.log('   Longueur:', data.longueur ? `${data.longueur} mm` : '❌ Non trouvé');
  console.log('   Largeur:', data.largeur ? `${data.largeur} mm` : '❌ Non trouvé');
  console.log('   Épaisseur:', data.epaisseur ? `${data.epaisseur} mm` : '❌ Non trouvé');
  console.log('');

  console.log('⚖️  POIDS:', data.poids ? `${data.poids} kg` : '❌ Non trouvé');
  console.log('');

  console.log('🔥 CLASSE FEU:', data.classeFeu || data.euroClasse || '❌ Non trouvé');
  console.log('');

  console.log('🌱 CO2:', data.co2 ? `${data.co2} kg CO2/UF` : '❌ Non trouvé');
  console.log('');

  console.log('📝 CARACTÉRISTIQUES:');
  console.log('   Type produit:', data.typeProduit || '❌ Non trouvé');
  console.log('   Matière:', data.matiere || '❌ Non trouvé');
  console.log('   Décor:', data.nomDecorSpec || data.decor || '❌ Non trouvé');
  console.log('   Réf. Décor:', data.refDecorSpec || data.refDecor || '❌ Non trouvé');
  console.log('   Support:', data.supportSpec || data.support || '❌ Non trouvé');
  console.log('   Teinte:', data.teinte || '❌ Non trouvé');
  console.log('   Gamme:', data.gamme || '❌ Non trouvé');
  console.log('   Finition:', data.finitionStructure || '❌ Non trouvé');
  console.log('   Classement:', data.classementParticules || '❌ Non trouvé');
  console.log('   Formaldéhyde:', data.emissionFormaldehyde || '❌ Non trouvé');
  console.log('   Ignifuge:', data.ignifuge || '❌ Non trouvé');
  console.log('   Type bois:', data.typeBois || '❌ Non trouvé');
  console.log('   2 faces identiques:', data.deuxFacesIdentiques || '❌ Non trouvé');
  console.log('');

  console.log('🖼️  IMAGE:', data.imageUrl ? '✅ Trouvée' : '❌ Non trouvée');
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🔧 SPECS EXTRAITES (${data.specsCount || 0} trouvées):`);
  console.log('═══════════════════════════════════════════════════════');
  if (Object.keys(data.specs).length > 0) {
    const sortedSpecs = Object.entries(data.specs).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, value] of sortedSpecs) {
      const displayValue = String(value).substring(0, 60);
      console.log(`   ${key}: ${displayValue}${String(value).length > 60 ? '...' : ''}`);
    }
  } else {
    console.log('   ❌ Aucune spec trouvée via les sélecteurs standards');
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 DEBUG - STRUCTURE HTML:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   H1:', data.htmlStructure.h1 || 'Non trouvé');
  console.log('   Tables:', data.htmlStructure.tables);
  console.log('   DLs:', data.htmlStructure.dls);
  console.log('   Prix elements:', JSON.stringify(data.htmlStructure.prices, null, 2));

  await browser.disconnect();
  console.log('\n✅ Test terminé!');
}

main().catch((e) => {
  console.error('❌ Erreur:', e);
  process.exit(1);
});
