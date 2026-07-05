const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.job.findMany();
  console.log('Total jobs:', jobs.length);
  jobs.forEach(j => console.log(`- ${j.type} | ${j.status} | queue: ${j.queueId}`));
}
main().finally(() => prisma.$disconnect());
