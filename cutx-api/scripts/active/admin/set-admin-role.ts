import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Liste tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('\n=== Utilisateurs existants ===');
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email} - ${u.firstName} ${u.lastName} - Role: ${u.role}`);
  });

  // Si on a un argument email, on met à jour le rôle
  const emailArg = process.argv[2];
  if (emailArg) {
    console.log(`\n=== Mise à jour du rôle pour ${emailArg} ===`);
    const updated = await prisma.user.update({
      where: { email: emailArg },
      data: { role: 'SUPER_ADMIN' },
    });
    console.log(`✓ ${updated.email} est maintenant SUPER_ADMIN`);
  } else {
    console.log('\nPour mettre à jour un utilisateur, relancez avec: npx tsx scripts/set-admin-role.ts <email>');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
