import { PrismaClient } from '@job-scheduler/database';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import { WorkerStatus } from '@job-scheduler/shared';
import { HeartbeatManager } from './heartbeat';
import { Poller } from './poller';
import { ShutdownHandler } from './shutdown';
import { Executor } from './executor';
import { SchedulerTick } from './scheduler-tick';
import { DeadWorkerReaper } from './reaper';

const prisma = new PrismaClient({
  log: process.env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

async function bootstrap() {
  console.log('⚙️  Starting Job Scheduler Worker...');

  const workerId = uuidv4();
  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
  
  // Register worker in DB
  await prisma.worker.create({
    data: {
      id: workerId,
      hostname: os.hostname(),
      pid: process.pid,
      status: WorkerStatus.IDLE,
      concurrencyCapacity: concurrency,
    },
  });
  
  console.log(`✅ Worker registered with ID: ${workerId}`);

  // Initialize components
  const executor = new Executor(prisma, workerId, concurrency);
  const poller = new Poller(prisma, workerId, executor);
  const heartbeat = new HeartbeatManager(prisma, workerId);
  const scheduler = new SchedulerTick(prisma);
  const reaper = new DeadWorkerReaper(prisma);
  
  const shutdown = new ShutdownHandler(prisma, workerId, poller, executor, heartbeat, scheduler, reaper);

  // Start components
  heartbeat.start();
  scheduler.start();
  reaper.start();
  poller.start();
  shutdown.listen();

  console.log('🚀 Worker is running and polling for jobs.');
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start worker:', err);
  process.exit(1);
});
