import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if metadata contains URLs
  const samples = await prisma.panel.findMany({
    where: { metadata: { not: null } },
    select: { reference: true, name: true, metadata: true },
    take: 5
  });

  console.log('=== Panels avec metadata ===');
  if (samples.length === 0) {
    console.log('Aucun panel avec metadata trouvé');
  } else {
    samples.forEach(p => {
      console.log('Ref:', p.reference);
      if (p.metadata) {
        try {
          const meta = JSON.parse(p.metadata);
          console.log('Metadata keys:', Object.keys(meta));
          if (meta.sourceUrl || meta.url || meta.link) {
            console.log('URL trouvée:', meta.sourceUrl || meta.url || meta.link);
          }
        } catch {
          console.log('Metadata (raw):', p.metadata.substring(0, 100));
        }
      }
      console.log('');
    });
  }

  // Count panels with metadata
  const countWithMeta = await prisma.panel.count({ where: { metadata: { not: null } } });
  const total = await prisma.panel.count();
  console.log('\nPanels avec metadata:', countWithMeta, '/', total);

  // Check catalogues
  console.log('\n=== Catalogues ===');
  const catalogues = await prisma.catalogue.findMany({
    select: { name: true, slug: true, logoUrl: true }
  });
  catalogues.forEach(c => {
    console.log(`${c.name} (${c.slug}): logo=${c.logoUrl ? 'oui' : 'non'}`);
  });

  await prisma.$disconnect();
}

main();
