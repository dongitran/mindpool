import { redisWorker, redis, MEETING_QUEUE_KEY } from '../lib/redis';
import { handleMeetingLoop } from '../services/mindx.service';
import { logger } from '../lib/logger';
import { logMeetingInfo, logMeetingError } from '../lib/meetingLogger';

let running = false;

/** Recover pools that were active but haven't been updated in 10+ minutes (likely crashed). */
async function recoverZombiePools(): Promise<void> {
  try {
    const { Pool } = await import('../models/Pool.js');
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const zombies = await Pool.find({
      status: 'active',
      updatedAt: { $lt: tenMinAgo },
    }).select('_id');

    if (zombies.length === 0) return;

    logger.warn(`[Worker] Found ${zombies.length} zombie pool(s), re-enqueueing`);
    for (const z of zombies) {
      const poolId = z._id.toString();
      // Acquire distributed lock to prevent duplicate recovery across workers
      const acquired = await redis.set(`zombie:${poolId}`, '1', 'EX', 60, 'NX');
      if (!acquired) continue;
      await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
      logMeetingInfo(poolId, 'zombie_recovery', 'Zombie pool re-enqueued on startup');
    }
  } catch (err) {
    logger.error('[Worker] Zombie pool recovery failed', { error: err });
  }
}

/**
 * Start the meeting loop worker.
 * Blocks on BLPOP waiting for jobs — runs in the same process as Express.
 * Each job is { poolId: string }.
 */
export async function startWorker(): Promise<void> {
  running = true;
  logger.info('[Worker] Meeting loop worker started');

  // Recover any zombie pools from a previous crash
  await recoverZombiePools();

  let consecutiveErrors = 0;

  while (running) {
    let poolId: string | undefined;
    try {
      // BLPOP with 5s timeout so we can check the `running` flag on each iteration
      const result = await redisWorker.blpop(MEETING_QUEUE_KEY, 5);
      if (!result) continue; // timeout — loop and check `running`

      consecutiveErrors = 0; // reset on successful BLPOP

      const [, payload] = result;
      try {
        ({ poolId } = JSON.parse(payload) as { poolId: string });
      } catch {
        logger.error('[Worker] Invalid job payload, skipping', { payload });
        continue;
      }

      logger.info('[Worker] Processing job', { poolId });
      logMeetingInfo(poolId, 'worker_job_received', 'Worker picked up meeting job');
      await handleMeetingLoop(poolId);
    } catch (error) {
      consecutiveErrors++;
      const delay = Math.min(1_000 * Math.pow(2, consecutiveErrors - 1), 30_000);
      logger.error('[Worker] Job error, retrying in %dms', delay, { error, consecutiveErrors });
      if (poolId) {
        logMeetingError(poolId, 'worker_job_error', 'Worker job failed', {
          consecutiveErrors,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.info('[Worker] Stopped');
}

export function stopWorker(): void {
  running = false;
}
