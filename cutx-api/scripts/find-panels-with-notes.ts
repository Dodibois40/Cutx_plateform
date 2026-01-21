import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Trouver la catégorie Références à vérifier
  const category = await prisma.category.findFirst({
    where: { name: { contains: 'vérifier', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true }
  });

  if (!category) {
    console.log('Catégorie "Références à vérifier" non trouvée');
    return;
  }

  console.log('Catégorie trouvée:', category.name, '(', category.id, ')');

  // Trouver les panneaux avec des notes (verificationNote)
  const panels = await prisma.panel.findMany({
    where: {
      categoryId: category.id,
      verificationNote: { not: null }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      description: true,
      verificationNote: true,
      defaultThickness: true,
      thickness: true,
      defaultLength: true,
      defaultWidth: true
    }
  });

  console.log('\nPanneaux avec notes:', panels.length);

  for (const p of panels) {
    console.log('\n' + '='.repeat(60));
    console.log('ID:', p.id);
    console.log('Référence:', p.reference);
    console.log('Nom:', p.name);
    console.log('Description:', p.description);
    console.log('Épaisseur:', p.defaultThickness || p.thickness);
    console.log('Dimensions:', p.defaultLength, 'x', p.defaultWidth);
    console.log('Note de vérification:', p.verificationNote);
  }

  // Aussi chercher tous les panneaux dans cette catégorie
  const allPanels = await prisma.panel.findMany({
    where: { categoryId: category.id },
    select: { id: true, reference: true, name: true, verificationNote: true }
  });

  console.log('\n\nTotal panneaux dans la catégorie:', allPanels.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
