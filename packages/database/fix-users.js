const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function fixOrphanedUsers() {
  const users = await prisma.user.findMany({
    include: { ownedOrganizations: true }
  });

  for (const user of users) {
    if (user.ownedOrganizations.length === 0) {
      console.log(`Fixing user ${user.email}...`);
      
      const org = await prisma.organization.create({
        data: {
          name: `${user.name || 'User'}'s Organization`,
          ownerId: user.id,
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'admin',
        },
      });

      await prisma.project.create({
        data: {
          name: 'Default Project',
          organizationId: org.id,
          apiKey: `sk_live_${uuidv4().replace(/-/g, '')}`,
        },
      });
      
      console.log(`Created Org and Project for ${user.email}`);
    }
  }
}

fixOrphanedUsers().catch(console.error).finally(() => prisma.$disconnect());
