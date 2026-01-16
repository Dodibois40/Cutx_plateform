/**
 * Script de migration du catalogue Bouney
 * Importe les données depuis La Manufacture de la Finition vers PostgreSQL
 *
 * Usage: npx tsx scripts/migrate-bouney-catalogue.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Chemins vers les catalogues source
const MANUFACTURE_PATH = 'C:/Users/doria/Desktop/La_Manufacture_de_la_finition/manufacture-frontend';
const CATALOGUE_PATH = path.join(MANUFACTURE_PATH, 'lib/catalogues/bouney/agencement');

interface ProduitSource {
  nom: string;
  reference: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  type: string;
  codeArticle: string;
  stock: string;
  marque: string;
  prixAchatM2?: number;
  marge?: number;
  prixVenteM2?: number;
}

interface MarqueData {
  marque: string;
  produits: ProduitSource[];
  images?: Record<string, string>;
}

interface CategoryStructure {
  name: string;
  slug: string;
  children?: CategoryStructure[];
  files?: string[];
}

// Structure des catégories Bouney
const CATEGORY_STRUCTURE: CategoryStructure[] = [
  {
    name: 'Stratifiés, Mélaminés, Compacts & Chants',
    slug: 'stratifies-melamines-compacts-chants',
    children: [
      { name: 'Unis', slug: 'unis', files: ['egger', 'fenix', 'formica', 'nebodesign', 'pfleiderer', 'polyrey', 'rauvisio', 'rehau-rauvisio', 'unilin'] },
      { name: 'Bois', slug: 'bois', files: ['egger', 'formica', 'nebodesign', 'pfleiderer', 'polyrey', 'unilin'] },
      { name: 'Matières', slug: 'matieres', files: ['egger', 'fenix', 'formica', 'nebodesign', 'pfleiderer', 'polyrey', 'unilin'] }
    ]
  },
  {
    name: 'Essences Fines',
    slug: 'essences-fines',
    children: [
      { name: 'Agglomérés replaqués', slug: 'agglomeres-replaques', files: ['chene', 'chataignier', 'frene', 'hetre', 'noyer-us', 'sapelli', 'autres-essences'] },
      { name: 'MDF replaqués', slug: 'mdf-replaques', files: ['chene', 'chataignier', 'frene', 'hetre', 'noyer-us', 'sapelli', 'querkus', 'shinnoki', 'nuxe', 'autres-essences'] },
      { name: 'Contreplaqués replaqués', slug: 'contreplaques-replaques', files: ['chene', 'chataignier', 'frene', 'hetre', 'noyer-us', 'sapelli', 'autres-essences'] },
      { name: 'Stratifiés et Flex', slug: 'stratifies-et-flex', files: ['chene', 'chataignier', 'frene', 'hetre', 'noyer-us', 'sapelli', 'autres-essences'] },
      { name: 'Lattes replaquées', slug: 'lattes-replaques', files: ['chene', 'chataignier', 'frene', 'hetre', 'noyer-us', 'sapelli', 'autres-essences'] }
    ]
  }
];

/**
 * Parse un fichier TypeScript de catalogue et extrait les données
 */
function parseTypescriptFile(filePath: string): MarqueData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extraire le nom de la marque
    const marqueMatch = content.match(/marque:\s*['"]([^'"]+)['"]/);
    const marque = marqueMatch ? marqueMatch[1] : 'Unknown';

    // Extraire les images
    const images: Record<string, string> = {};
    const imagesBlockMatch = content.match(/images:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    if (imagesBlockMatch) {
      const imagesContent = imagesBlockMatch[1];
      const imageMatches = imagesContent.matchAll(/'([^']+)':\s*'([^']+)'/g);
      for (const match of imageMatches) {
        images[match[1]] = match[2];
      }
    }

    // Extraire les produits
    const produits: ProduitSource[] = [];
    const produitsBlockMatch = content.match(/produits:\s*\[([\s\S]*?)\]\s*(?:,\s*}|}\s*;)/);

    if (produitsBlockMatch) {
      const produitsContent = produitsBlockMatch[1];
      const productMatches = produitsContent.matchAll(/\{\s*nom:\s*'([^']*)',\s*reference:\s*'([^']*)',\s*longueur:\s*(\d+(?:\.\d+)?),\s*largeur:\s*(\d+(?:\.\d+)?),\s*epaisseur:\s*(\d+(?:\.\d+)?),\s*type:\s*'([^']*)',\s*codeArticle:\s*'([^']*)',\s*stock:\s*'([^']*)',\s*marque:\s*'([^']*)'[^}]*\}/g);

      for (const match of productMatches) {
        produits.push({
          nom: match[1],
          reference: match[2],
          longueur: parseFloat(match[3]),
          largeur: parseFloat(match[4]),
          epaisseur: parseFloat(match[5]),
          type: match[6],
          codeArticle: match[7],
          stock: match[8],
          marque: match[9],
          prixAchatM2: 0
        });
      }
    }

    console.log(`  📄 ${path.basename(filePath)}: ${produits.length} produits, ${Object.keys(images).length} images`);

    return { marque, produits, images };
  } catch (error) {
    console.error(`  ❌ Erreur parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Collecte tous les fichiers TypeScript de catalogue
 */
function collectCatalogueFiles(): { path: string; category: string; subcategory: string }[] {
  const files: { path: string; category: string; subcategory: string }[] = [];

  for (const category of CATEGORY_STRUCTURE) {
    const categoryPath = path.join(CATALOGUE_PATH, category.slug);

    if (category.children) {
      for (const subcategory of category.children) {
        const subcategoryPath = path.join(categoryPath, subcategory.slug);

        if (subcategory.files) {
          for (const file of subcategory.files) {
            const filePath = path.join(subcategoryPath, `${file}.ts`);
            if (fs.existsSync(filePath)) {
              files.push({
                path: filePath,
                category: category.name,
                subcategory: subcategory.name
              });
            }
          }
        }
      }
    }
  }

  return files;
}

async function main() {
  console.log('🚀 Démarrage de la migration du catalogue Bouney\n');

  try {
    // 1. Créer ou récupérer le catalogue Bouney
    console.log('📦 Création du catalogue Bouney...');
    const catalogue = await prisma.catalogue.upsert({
      where: { slug: 'bouney' },
      update: {
        name: 'Bouney Agencement',
        description: 'Catalogue complet Bouney - Stratifiés, Mélaminés, Essences Fines',
        isActive: true
      },
      create: {
        name: 'Bouney Agencement',
        slug: 'bouney',
        description: 'Catalogue complet Bouney - Stratifiés, Mélaminés, Essences Fines',
        isActive: true
      }
    });
    console.log(`  ✅ Catalogue créé: ${catalogue.id}\n`);

    // 2. Créer les catégories
    console.log('📁 Création des catégories...');
    const categoryMap = new Map<string, string>(); // slug -> id

    for (const category of CATEGORY_STRUCTURE) {
      const parentCategory = await prisma.category.upsert({
        where: {
          catalogueId_slug: { catalogueId: catalogue.id, slug: category.slug }
        },
        update: { name: category.name },
        create: {
          name: category.name,
          slug: category.slug,
          catalogueId: catalogue.id
        }
      });
      categoryMap.set(category.slug, parentCategory.id);
      console.log(`  📂 ${category.name}`);

      if (category.children) {
        for (const subcategory of category.children) {
          const childCategory = await prisma.category.upsert({
            where: {
              catalogueId_slug: { catalogueId: catalogue.id, slug: `${category.slug}-${subcategory.slug}` }
            },
            update: {
              name: subcategory.name,
              parentId: parentCategory.id
            },
            create: {
              name: subcategory.name,
              slug: `${category.slug}-${subcategory.slug}`,
              catalogueId: catalogue.id,
              parentId: parentCategory.id
            }
          });
          categoryMap.set(`${category.slug}/${subcategory.slug}`, childCategory.id);
          console.log(`    └─ ${subcategory.name}`);
        }
      }
    }
    console.log('');

    // 3. Collecter et parser tous les fichiers
    console.log('📖 Lecture des fichiers catalogue...');
    const catalogueFiles = collectCatalogueFiles();
    console.log(`  Trouvé ${catalogueFiles.length} fichiers\n`);

    // 4. Parser et importer les produits
    console.log('📥 Import des produits...');
    let totalProduits = 0;
    let totalImages = 0;
    const allImages = new Map<string, string>(); // reference -> imageUrl

    for (const file of catalogueFiles) {
      const data = parseTypescriptFile(file.path);

      if (data && data.produits.length > 0) {
        // Stocker les images
        if (data.images) {
          for (const [ref, url] of Object.entries(data.images)) {
            allImages.set(ref, url);
          }
          totalImages += Object.keys(data.images).length;
        }

        // Trouver la catégorie
        const categorySlug = CATEGORY_STRUCTURE.find(c => file.category === c.name)?.slug;
        const subcategorySlug = CATEGORY_STRUCTURE
          .find(c => file.category === c.name)
          ?.children?.find(s => file.subcategory === s.name)?.slug;

        const categoryId = categorySlug && subcategorySlug
          ? categoryMap.get(`${categorySlug}/${subcategorySlug}`)
          : null;

        // Grouper les produits par référence pour consolider les épaisseurs
        const productsByRef = new Map<string, ProduitSource[]>();
        for (const produit of data.produits) {
          const key = `${produit.reference}-${produit.type}`;
          if (!productsByRef.has(key)) {
            productsByRef.set(key, []);
          }
          productsByRef.get(key)!.push(produit);
        }

        // Créer les panneaux
        for (const [key, produits] of productsByRef) {
          const first = produits[0];
          const thicknesses = [...new Set(produits.map(p => p.epaisseur))].sort((a, b) => a - b);
          const imageUrl = allImages.get(first.reference) || null;

          const uniqueRef = `${first.reference}-${first.type.replace(/\s+/g, '-').toLowerCase()}-${data.marque.toLowerCase()}`;

          try {
            await prisma.panel.upsert({
              where: {
                catalogueId_reference: { catalogueId: catalogue.id, reference: uniqueRef }
              },
              update: {
                name: first.nom.replace(/\s+\d+mm$/, ''), // Enlever l'épaisseur du nom
                thickness: thicknesses,
                defaultLength: Math.round(first.longueur),
                defaultWidth: Math.round(first.largeur),
                material: first.type,
                finish: data.marque,
                imageUrl: imageUrl,
                categoryId: categoryId,
                isActive: true
              },
              create: {
                reference: uniqueRef,
                name: first.nom.replace(/\s+\d+mm$/, ''),
                thickness: thicknesses,
                defaultLength: Math.round(first.longueur),
                defaultWidth: Math.round(first.largeur),
                material: first.type,
                finish: data.marque,
                imageUrl: imageUrl,
                catalogueId: catalogue.id,
                categoryId: categoryId,
                isActive: true
              }
            });
            totalProduits++;
          } catch (err) {
            // Ignorer les doublons silencieusement
          }
        }
      }
    }

    console.log(`\n✅ Migration terminée !`);
    console.log(`   📦 Catalogue: Bouney Agencement`);
    console.log(`   📁 Catégories: ${categoryMap.size}`);
    console.log(`   🪵 Panneaux: ${totalProduits}`);
    console.log(`   🖼️  Images: ${totalImages}`);

    // Vérification
    const stats = await prisma.panel.count({ where: { catalogueId: catalogue.id } });
    console.log(`\n📊 Vérification: ${stats} panneaux en base`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
