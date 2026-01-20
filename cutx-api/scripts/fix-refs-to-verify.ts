import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Target category: Décors Bois
  const targetCategoryId = 'cmkk8c4pb0007byps02haxwgy';

  // Panel IDs to fix
  const panelIds = [
    'cmjvh4eys005cby80tb4v3bar', // Lime White
    'cmjvi6rsl00hwby80p449v80e', // Elm White
    'cmjvj2xnp00s6by80z0u1vjf1', // Rustiv Chestnut White
  ];

  console.log('=== FIXING PANELS ===\n');

  // Verify target category exists
  const targetCat = await prisma.category.findUnique({
    where: { id: targetCategoryId },
    select: { id: true, name: true, slug: true },
  });

  if (!targetCat) {
    console.error('Target category not found!');
    return;
  }

  console.log(`Target category: ${targetCat.name} (${targetCat.slug})\n`);

  // Update each panel
  for (const panelId of panelIds) {
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      select: { id: true, reference: true, name: true, verificationNote: true },
    });

    if (!panel) {
      console.log(`Panel ${panelId} not found, skipping`);
      continue;
    }

    console.log(`Fixing: ${panel.reference}`);
    console.log(`  Name: ${panel.name}`);
    console.log(`  Note was: ${panel.verificationNote}`);

    // Update the panel
    await prisma.panel.update({
      where: { id: panelId },
      data: {
        categoryId: targetCategoryId,
        decorCategory: 'BOIS', // Set decor category to BOIS
        verificationNote: null, // Clear the note since we fixed it
        reviewStatus: 'VERIFIE', // Mark as verified
      },
    });

    console.log(`  ✅ Moved to "${targetCat.name}" and cleared note\n`);
  }

  console.log('=== DONE ===');

  // Verify final state
  const updatedPanels = await prisma.panel.findMany({
    where: { id: { in: panelIds } },
    select: {
      reference: true,
      category: { select: { name: true } },
      decorCategory: true,
      verificationNote: true,
    },
  });

  console.log('\nFinal state:');
  for (const p of updatedPanels) {
    console.log(`- ${p.reference}: ${p.category?.name}, decor=${p.decorCategory}, note=${p.verificationNote || '(none)'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
