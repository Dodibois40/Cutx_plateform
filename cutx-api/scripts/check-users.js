const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, role: true, firstName: true, lastName: true }
  });

  console.log('=== UTILISATEURS ===\n');
  for (const u of users) {
    const roleIcon = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? '👑' : '👤';
    console.log(roleIcon + ' ' + (u.email || 'no-email'));
    console.log('   Role: ' + u.role);
    console.log('   Nom: ' + (u.firstName || '') + ' ' + (u.lastName || ''));
    console.log('');
  }

  await p.$disconnect();
}

main().catch(console.error);
