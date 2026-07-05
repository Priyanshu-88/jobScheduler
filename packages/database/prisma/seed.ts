// ============================================================================
// Database Seed Script
// ============================================================================
// Populates the database with sample data for local development.
// Run: npm run db:seed (from root) or npx prisma db seed (from packages/database)
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters due to foreign keys)
  await prisma.jobLog.deleteMany();
  await prisma.workerHeartbeat.deleteMany();
  await prisma.jobExecution.deleteMany();
  await prisma.deadLetterJob.deleteMany();
  await prisma.scheduledJob.deleteMany();
  await prisma.job.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.retryPolicy.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.user.deleteMany();

  // ---- Users ----
  // Note: In production, passwords are hashed with argon2.
  // For seed data, we use a placeholder hash. The auth module
  // will hash properly during registration.
  const adminUser = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@jobscheduler.dev',
      passwordHash: '$placeholder_hash_use_register_endpoint',
      name: 'Admin User',
      role: 'admin',
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'dev@jobscheduler.dev',
      passwordHash: '$placeholder_hash_use_register_endpoint',
      name: 'Dev User',
      role: 'member',
    },
  });

  console.log('  ✓ Users created');

  // ---- Organization ----
  const org = await prisma.organization.create({
    data: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Acme Corp',
      ownerId: adminUser.id,
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: adminUser.id, role: 'admin' },
      { organizationId: org.id, userId: memberUser.id, role: 'member' },
    ],
  });

  console.log('  ✓ Organization created');

  // ---- Retry Policies ----
  const fixedRetry = await prisma.retryPolicy.create({
    data: {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Fixed 5s, 3 attempts',
      strategy: 'fixed',
      baseDelayMs: 5000,
      maxDelayMs: 5000,
      maxAttempts: 3,
      jitter: false,
    },
  });

  const exponentialRetry = await prisma.retryPolicy.create({
    data: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'Exponential 1s-60s, 5 attempts',
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 60000,
      maxAttempts: 5,
      jitter: true,
    },
  });

  console.log('  ✓ Retry policies created');

  // ---- Project ----
  const project = await prisma.project.create({
    data: {
      id: '00000000-0000-0000-0000-000000000030',
      organizationId: org.id,
      name: 'Main App',
      apiKey: 'sk_dev_main_app_key_12345',
    },
  });

  console.log('  ✓ Project created');

  // ---- Queues ----
  const emailQueue = await prisma.queue.create({
    data: {
      id: '00000000-0000-0000-0000-000000000040',
      projectId: project.id,
      name: 'email-notifications',
      priority: 10,
      concurrencyLimit: 3,
      defaultRetryPolicyId: fixedRetry.id,
    },
  });

  const reportQueue = await prisma.queue.create({
    data: {
      id: '00000000-0000-0000-0000-000000000041',
      projectId: project.id,
      name: 'report-generation',
      priority: 5,
      concurrencyLimit: 2,
      defaultRetryPolicyId: exponentialRetry.id,
    },
  });

  const webhookQueue = await prisma.queue.create({
    data: {
      id: '00000000-0000-0000-0000-000000000042',
      projectId: project.id,
      name: 'webhook-delivery',
      priority: 8,
      concurrencyLimit: 10,
      defaultRetryPolicyId: exponentialRetry.id,
    },
  });

  console.log('  ✓ Queues created');

  // ---- Sample Jobs ----
  // Immediate job
  await prisma.job.create({
    data: {
      queueId: emailQueue.id,
      type: 'immediate',
      payload: JSON.stringify({
        to: 'user@example.com',
        subject: 'Welcome!',
        body: 'Thanks for signing up.',
      }),
      status: 'queued',
      priority: 5,
      maxAttempts: 3,
      retryPolicyId: fixedRetry.id,
    },
  });

  // Delayed job (runs 5 minutes from now)
  await prisma.job.create({
    data: {
      queueId: emailQueue.id,
      type: 'delayed',
      payload: JSON.stringify({
        to: 'user@example.com',
        subject: 'Follow-up',
        body: 'How are you finding our service?',
      }),
      status: 'scheduled',
      priority: 3,
      runAt: new Date(Date.now() + 5 * 60 * 1000),
      maxAttempts: 3,
      retryPolicyId: fixedRetry.id,
    },
  });

  // Batch jobs
  const batchId = 'batch-001-reports';
  for (let i = 1; i <= 3; i++) {
    await prisma.job.create({
      data: {
        queueId: reportQueue.id,
        type: 'batch',
        payload: JSON.stringify({ reportType: 'monthly', month: i }),
        status: 'queued',
        priority: 2,
        batchId,
        maxAttempts: 5,
        retryPolicyId: exponentialRetry.id,
      },
    });
  }

  console.log('  ✓ Sample jobs created');

  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('  Admin:  admin@jobscheduler.dev');
  console.log('  Member: dev@jobscheduler.dev');
  console.log('  API Key: sk_dev_main_app_key_12345');
  console.log('');
  console.log('  Note: Use the /api/auth/register endpoint to create users');
  console.log('  with properly hashed passwords.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
