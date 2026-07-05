const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { memberships: true } });
  console.log('Users:', JSON.stringify(users, null, 2));
  const orgs = await prisma.organization.findMany();
  console.log('Orgs:', orgs);
  const projects = await prisma.project.findMany();
  console.log('Projects:', projects);
  const queues = await prisma.queue.findMany();
  console.log('Queues:', queues);
}
main().finally(() => prisma.$disconnect());
