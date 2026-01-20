import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function assignBatch() {
  console.log('🚀 Assignation batch de 10 chants ABS...');
  
  // Get the category by slug (slug is unique in practice)
  const category = await prisma.category.findFirst({
    where: { slug: 'chants-abs' },
    select: { id: true, name: true }
  });
  
  if (!category) {
    console.log('❌ Catégorie chants-abs non trouvée');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📁 Catégorie:', category.name);
  
  // Get first 10 unassigned panels with subtype CHANT_ABS
  const panels = await prisma.panel.findMany({
    where: {
      categoryId: null,
      panelSubType: 'CHANT_ABS'
    },
    take: 10,
    orderBy: { reference: 'asc' },
    select: { id: true, reference: true, name: true }
  });
  
  console.log('\n📦 Panneaux à assigner:', panels.length);
  panels.forEach((p, i) => console.log(`  ${i+1}. ${p.reference}`));
  
  if (panels.length === 0) {
    console.log('✅ Aucun panneau à assigner (tous déjà assignés)');
    await prisma.$disconnect();
    return;
  }
  
  // Assign them
  const result = await prisma.panel.updateMany({
    where: {
      id: { in: panels.map(p => p.id) }
    },
    data: {
      categoryId: category.id
    }
  });
  
  console.log('\n✅ Assignés:', result.count, 'panneaux à Chants > Chants ABS');
  
  // Show remaining
  const remaining = await prisma.panel.count({ where: { categoryId: null } });
  console.log('📊 Restants sans catégorie:', remaining);
  
  await prisma.$disconnect();
}

assignBatch().catch(console.error);
