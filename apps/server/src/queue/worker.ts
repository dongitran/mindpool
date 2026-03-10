import { redisWorker, MEETING_QUEUE_KEY } from '../lib/redis';
import { handleMeetingLoop } from '../services/mindx.service';
import { logger } from '../lib/logger';

let running = false;

/**
 * Start the meeting loop worker.
 * Blocks on BLPOP waiting for jobs — runs in the same process as Express.
 * Each job is { poolId: string }.
 */
export async function startWorker(): Promise<void> {
  running = true;
  logger.info('[Worker] Meeting loop worker started');

  let consecutiveErrors = 0;

  while (running) {
    try {
      // BLPOP with 5s timeout so we can check the `running` flag on each iteration
      const result = await redisWorker.blpop(MEETING_QUEUE_KEY, 5);
      if (!result) continue; // timeout — loop and check `running`

      consecutiveErrors = 0; // reset on successful BLPOP

      const [, payload] = result;
      let poolId: string;
      try {
        ({ poolId } = JSON.parse(payload) as { poolId: string });
      } catch {
        logger.error('[Worker] Invalid job payload, skipping', { payload });
        continue;
      }

      logger.info('[Worker] Processing job', { poolId });
      await handleMeetingLoop(poolId);
    } catch (error) {
      consecutiveErrors++;
      const delay = Math.min(1_000 * Math.pow(2, consecutiveErrors - 1), 30_000);
      logger.error('[Worker] Job error, retrying in %dms', delay, { error, consecutiveErrors });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.info('[Worker] Stopped');
}

export function stopWorker(): void {
  running = false;
}
