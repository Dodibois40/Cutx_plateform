import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSearchVector() {
  // Check if searchVector column exists
  const columns = await prisma.$queryRaw<any[]>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'Panel' AND column_name = 'searchVector'
  `;
  console.log('searchVector column:', columns.length > 0 ? columns[0] : 'NOT FOUND');

  // Check the trigger function definition
  const fnDef = await prisma.$queryRaw<any[]>`
    SELECT pg_get_functiondef(oid) as definition
    FROM pg_proc
    WHERE proname = 'panel_search_vector_update'
  `;
  console.log('\nTrigger function definition:');
  if (fnDef.length > 0) {
    console.log(fnDef[0].definition);
  } else {
    console.log('Function not found');
  }
}

checkSearchVector().catch(console.error).finally(() => prisma.$disconnect());
