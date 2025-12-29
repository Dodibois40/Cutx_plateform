/**
 * Import du catalogue complet depuis La Manufacture de la Finition
 *
 * Usage: npx tsx scripts/import-manufacture-catalogue.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ManufactureProduit {
  id: string;
  nom: string;
  reference: string;
  codeArticle: string;
  marque: string;
  categorie: string;
  sousCategorie: string;
  type: string;
  qualiteSupport?: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  stock: string;
  prixAchatM2?: number;
  marge?: number;
  prixVenteM2?: number;
  imageUrl?: string;
  disponible: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('🚀 Import du catalogue Manufacture vers CutX\n');

  // Charger l'export
  const exportPath = 'C:/Users/doria/Desktop/La_Manufacture_de_la_finition/manufacture-backend-api/catalogue-full-export.json';

  if (!fs.existsSync(exportPath)) {
    console.error('❌ Fichier export non trouvé:', exportPath);
    process.exit(1);
  }

  const data: ManufactureProduit[] = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  console.log(`📦 ${data.length} produits à importer\n`);

  // 1. Créer/récupérer le catalogue Bouney
  console.log('📦 Mise à jour du catalogue Bouney...');
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: 'bouney' },
    update: {
      name: 'Bouney Agencement',
      description: 'Catalogue complet Bouney - 2165 références',
      isActive: true
    },
    create: {
      name: 'Bouney Agencement',
      slug: 'bouney',
      description: 'Catalogue complet Bouney - 2165 références',
      isActive: true
    }
  });

  // 2. Créer les catégories
  console.log('📁 Création des catégories...');
  const categoryMap = new Map<string, string>(); // "categorie/sousCategorie" -> categoryId

  // Récupérer les catégories uniques
  const categories = new Map<string, Set<string>>();
  data.forEach(p => {
    if (!categories.has(p.categorie)) {
      categories.set(p.categorie, new Set());
    }
    categories.get(p.categorie)!.add(p.sousCategorie);
  });

  for (const [catName, subCats] of categories) {
    const catSlug = slugify(catName);

    // Créer catégorie parent
    const parentCat = await prisma.category.upsert({
      where: { catalogueId_slug: { catalogueId: catalogue.id, slug: catSlug } },
      update: { name: catName },
      create: {
        name: catName,
        slug: catSlug,
        catalogueId: catalogue.id
      }
    });
    console.log(`  📂 ${catName}`);

    // Créer sous-catégories
    for (const subCatName of subCats) {
      const subCatSlug = `${catSlug}-${slugify(subCatName)}`;

      const subCat = await prisma.category.upsert({
        where: { catalogueId_slug: { catalogueId: catalogue.id, slug: subCatSlug } },
        update: { name: subCatName, parentId: parentCat.id },
        create: {
          name: subCatName,
          slug: subCatSlug,
          catalogueId: catalogue.id,
          parentId: parentCat.id
        }
      });
      categoryMap.set(`${catName}/${subCatName}`, subCat.id);
      console.log(`    └─ ${subCatName}`);
    }
  }

  // 3. Supprimer les anciens panneaux pour éviter les doublons
  console.log('\n🗑️  Suppression des anciens panneaux...');
  const deleted = await prisma.panel.deleteMany({
    where: { catalogueId: catalogue.id }
  });
  console.log(`  Supprimé ${deleted.count} panneaux`);

  // 4. Importer les produits
  console.log('\n📥 Import des produits...');
  let imported = 0;
  let errors = 0;

  // Grouper par référence unique pour consolider les épaisseurs
  const productGroups = new Map<string, ManufactureProduit[]>();

  data.forEach(p => {
    // Clé unique: reference + type + marque
    const key = `${p.reference}-${p.type}-${p.marque}`;
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(p);
  });

  console.log(`  ${productGroups.size} groupes de produits uniques`);

  for (const [key, products] of productGroups) {
    const first = products[0];
    const categoryKey = `${first.categorie}/${first.sousCategorie}`;
    const categoryId = categoryMap.get(categoryKey);

    // Consolider les épaisseurs
    const thicknesses = [...new Set(products.map(p => p.epaisseur))].sort((a, b) => a - b);

    // Utiliser le prix le plus récent
    const priceM2 = products.find(p => p.prixVenteM2)?.prixVenteM2 ||
                    products.find(p => p.prixAchatM2)?.prixAchatM2 ||
                    null;

    // Utiliser l'image si disponible
    const imageUrl = products.find(p => p.imageUrl)?.imageUrl || null;

    try {
      await prisma.panel.create({
        data: {
          reference: `${first.codeArticle}-${slugify(first.marque)}`,
          name: first.nom.replace(/\s+\d+mm$/, '').replace(/\s+\d+(\.\d+)?mm$/, ''),
          description: first.qualiteSupport ? `Qualité: ${first.qualiteSupport}` : null,
          thickness: thicknesses,
          defaultLength: first.longueur,
          defaultWidth: first.largeur,
          pricePerM2: priceM2,
          material: first.type,
          finish: first.marque,
          colorCode: first.reference,
          imageUrl: imageUrl,
          catalogueId: catalogue.id,
          categoryId: categoryId || null,
          isActive: first.disponible
        }
      });
      imported++;
    } catch (err) {
      errors++;
    }
  }

  // 5. Stats finales
  console.log('\n✅ Import terminé !');
  console.log(`   📦 Catalogue: Bouney Agencement`);
  console.log(`   📁 Catégories: ${categoryMap.size}`);
  console.log(`   🪵 Panneaux importés: ${imported}`);
  if (errors > 0) {
    console.log(`   ⚠️  Erreurs: ${errors}`);
  }

  // Vérification par catégorie
  console.log('\n📊 Vérification par catégorie:');
  const catStats = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { catalogueId: catalogue.id },
    _count: true
  });

  for (const stat of catStats) {
    if (stat.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: stat.categoryId },
        include: { parent: true }
      });
      if (cat) {
        const fullName = cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
        console.log(`   - ${fullName}: ${stat._count}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
