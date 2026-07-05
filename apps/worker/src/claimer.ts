import { PrismaClient, Job } from '@job-scheduler/database';
import { JobStatus, WorkerStatus } from '@job-scheduler/shared';

export class Claimer {
  constructor(private prisma: PrismaClient, private workerId: string) {}

  /**
   * Atomically claims jobs using SQLite transactions.
   * Since SQLite uses serializable transactions under the hood for writes,
   * doing a SELECT followed by an UPDATE inside $transaction effectively prevents double-claiming,
   * provided we use WAL mode and handle concurrent write waits properly.
   */
  async claimJobs(limit: number): Promise<Job[]> {
    if (limit <= 0) return [];

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Find eligible jobs: queued, runAt in past or null, ordered by priority and runAt
        const eligibleJobs = await tx.$queryRawUnsafe<{ id: string }[]>(`
          SELECT id FROM jobs
          WHERE status = '${JobStatus.QUEUED}'
            AND (run_at IS NULL OR run_at <= datetime('now'))
          ORDER BY priority DESC, run_at ASC
          LIMIT ?
        `, limit);

        if (eligibleJobs.length === 0) {
          return [];
        }

        const ids = eligibleJobs.map((j) => j.id);

        // Mark as claimed
        const placeholders = ids.map(() => '?').join(',');
        await tx.$executeRawUnsafe(`
          UPDATE jobs 
          SET status = '${JobStatus.CLAIMED}', 
              worker_id = ?, 
              claimed_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id IN (${placeholders})
        `, this.workerId, ...ids);

        // Fetch and return the claimed jobs
        return tx.job.findMany({
          where: { id: { in: ids } }
        });
      });
    } catch (err: any) {
      if (err.code === 'SQLITE_BUSY') {
        // Expected under high concurrency; the poller will just try again on the next tick
        return [];
      }
      throw err;
    }
  }
}
