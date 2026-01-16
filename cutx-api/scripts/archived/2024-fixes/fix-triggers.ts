import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Check and Fix Panel Triggers ===\n');

  // Check for triggers
  const triggers = await prisma.$queryRaw<{ trigger_name: string; event_manipulation: string }[]>`
    SELECT trigger_name, event_manipulation
    FROM information_schema.triggers
    WHERE event_object_table = 'Panel'
  `;

  console.log('Triggers found:', triggers.length);
  triggers.forEach(t => console.log(' -', t.trigger_name, '|', t.event_manipulation));

  // Check if searchVector column exists
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Panel' AND column_name = 'searchVector'
  `;

  console.log('\nsearchVector column exists:', columns.length > 0);

  // Drop searchVector triggers if they exist
  const searchVectorTriggers = triggers.filter(t =>
    t.trigger_name.toLowerCase().includes('search') ||
    t.trigger_name.toLowerCase().includes('vector')
  );

  if (searchVectorTriggers.length > 0) {
    console.log('\nDropping searchVector triggers...');
    for (const t of searchVectorTriggers) {
      try {
        await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${t.trigger_name}" ON "Panel"`);
        console.log(' ✓ Dropped:', t.trigger_name);
      } catch (e: any) {
        console.log(' ✗ Failed:', t.trigger_name, '-', e.message);
      }
    }
  }

  // Try to drop any trigger that might reference searchVector
  console.log('\nDropping any trigger that might cause issues...');
  try {
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS panel_search_vector_update ON "Panel"`;
    console.log(' ✓ Dropped panel_search_vector_update');
  } catch (e) {
    console.log(' - panel_search_vector_update not found or already dropped');
  }

  try {
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS update_panel_search_vector ON "Panel"`;
    console.log(' ✓ Dropped update_panel_search_vector');
  } catch (e) {
    console.log(' - update_panel_search_vector not found or already dropped');
  }

  // Verify triggers are gone
  const remainingTriggers = await prisma.$queryRaw<{ trigger_name: string }[]>`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'Panel'
  `;

  console.log('\nRemaining triggers:', remainingTriggers.length);
  remainingTriggers.forEach(t => console.log(' -', t.trigger_name));

  console.log('\n✓ Done! Now try running the fix script again.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
