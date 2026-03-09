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

  while (running) {
    try {
      // BLPOP with 5s timeout so we can check the `running` flag on each iteration
      const result = await redisWorker.blpop(MEETING_QUEUE_KEY, 5);
      if (!result) continue; // timeout — loop and check `running`

      const [, payload] = result;
      const { poolId } = JSON.parse(payload) as { poolId: string };

      logger.info('[Worker] Processing job', { poolId });
      await handleMeetingLoop(poolId);
    } catch (error) {
      logger.error('[Worker] Job error', { error });
      // Small back-off to avoid tight crash loops
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  logger.info('[Worker] Stopped');
}

export function stopWorker(): void {
  running = false;
}
