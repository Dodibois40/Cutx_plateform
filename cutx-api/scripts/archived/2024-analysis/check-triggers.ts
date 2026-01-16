import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTriggers() {
  const triggers = await prisma.$queryRaw<any[]>`
    SELECT tgname, tgrelid::regclass::text as table_name, pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid = 'public."Panel"'::regclass
    AND NOT tgisinternal
  `;
  console.log('Triggers on Panel table:');
  triggers.forEach(t => {
    console.log(`\n- ${t.tgname}:`);
    console.log(`  ${t.definition}`);
  });
  return triggers;
}

checkTriggers().catch(console.error).finally(() => prisma.$disconnect());
