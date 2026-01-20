import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  console.log('=== TEST TO_TSVECTOR ===\n');

  const tests = await prisma.$queryRaw<any[]>`
    SELECT
      to_tsvector('french', 'chêne')::text as french_chene,
      to_tsvector('french', 'chene')::text as french_chene_no_accent,
      to_tsvector('simple', 'chêne')::text as simple_chene,
      to_tsvector('simple', 'chene')::text as simple_chene_no_accent
  `;

  console.log("french 'chêne':", tests[0].french_chene);
  console.log("french 'chene':", tests[0].french_chene_no_accent);
  console.log("simple 'chêne':", tests[0].simple_chene);
  console.log("simple 'chene':", tests[0].simple_chene_no_accent);

  // Test du trigger actuel
  console.log('\n=== TRIGGER ACTUEL ===\n');
  const triggerTest = await prisma.$queryRaw<any[]>`
    SELECT
      to_tsvector('french_unaccent',
        unaccent(coalesce('Chant bois chêne', '')) || ' ' ||
        unaccent(coalesce('BCB-BOI-CHANTBOIS-W0.026-T0.5-83814', ''))
      )::text as trigger_result
  `;
  console.log('Trigger result:', triggerTest[0].trigger_result);

  // Vérifier si french_unaccent existe
  console.log('\n=== CONFIGURATIONS TEXT SEARCH ===');
  const configs = await prisma.$queryRaw<any[]>`
    SELECT cfgname FROM pg_ts_config WHERE cfgname LIKE '%french%' OR cfgname = 'simple'
  `;
  configs.forEach(c => console.log('  -', c.cfgname));

  await prisma.$disconnect();
}

test().catch(console.error);
