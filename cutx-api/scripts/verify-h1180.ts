import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyH1180() {
  console.log('🔍 Vérification des panels H1180...\n');

  // All panels with H1180 in manufacturerRef
  const panels = await prisma.panel.findMany({
    where: {
      manufacturerRef: { contains: 'H1180', mode: 'insensitive' },
    },
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      imageUrl: true,
      catalogue: { select: { name: true } },
    },
  });

  console.log(`📊 ${panels.length} panels avec manufacturerRef contenant H1180:\n`);

  // Group by catalogue
  const byCateg: Record<string, typeof panels> = {};
  panels.forEach(p => {
    const cat = p.catalogue?.name || 'Unknown';
    if (!byCateg[cat]) byCateg[cat] = [];
    byCateg[cat].push(p);
  });

  for (const [cat, panelList] of Object.entries(byCateg)) {
    console.log(`\n${cat} (${panelList.length} panels):`);
    panelList.forEach(p => {
      const hasImage = p.imageUrl ? '🖼️' : '❌';
      console.log(`  ${hasImage} ${p.reference}: ${p.name?.substring(0, 40)}... | REF: ${p.manufacturerRef}`);
    });
  }

  // Check for panels that still have null manufacturerRef but H1180 in colorChoice
  const stillMissing = await prisma.panel.findMany({
    where: {
      manufacturerRef: null,
      colorChoice: { contains: 'H1180', mode: 'insensitive' },
    },
    select: { reference: true, colorChoice: true },
  });

  if (stillMissing.length > 0) {
    console.log(`\n⚠️ ${stillMissing.length} panels ont encore H1180 dans colorChoice mais manufacturerRef=null`);
    stillMissing.forEach(p => console.log(`  ${p.reference}: ${p.colorChoice}`));
  }
}

verifyH1180().catch(console.error).finally(() => prisma.$disconnect());
