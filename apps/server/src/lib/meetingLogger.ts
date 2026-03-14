import { config } from '../config';
import { MeetingLog } from '../models/MeetingLog';
import type { MeetingEvent, MeetingLogLevel } from '../models/MeetingLog';
import { logger } from './logger';

/**
 * Log a structured meeting event to MongoDB (fire-and-forget).
 * Returns immediately — never blocks the meeting loop.
 * No-ops when LOGS_MEETING_ENABLE=false.
 */
export function logMeetingEvent(
  poolId: string,
  event: MeetingEvent,
  level: MeetingLogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!config.logsMeetingEnable) return;

  MeetingLog.create({ poolId, event, level, message, data: data ?? null }).catch((err) => {
    logger.error('[MeetingLog] Failed to save event', {
      event,
      poolId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export function logMeetingInfo(
  poolId: string,
  event: MeetingEvent,
  message: string,
  data?: Record<string, unknown>
): void {
  logMeetingEvent(poolId, event, 'info', message, data);
}

export function logMeetingWarn(
  poolId: string,
  event: MeetingEvent,
  message: string,
  data?: Record<string, unknown>
): void {
  logMeetingEvent(poolId, event, 'warn', message, data);
}

export function logMeetingError(
  poolId: string,
  event: MeetingEvent,
  message: string,
  data?: Record<string, unknown>
): void {
  logMeetingEvent(poolId, event, 'error', message, data);
}
