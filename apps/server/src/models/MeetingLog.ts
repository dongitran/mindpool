import mongoose, { Schema, Document } from 'mongoose';

export type MeetingEvent =
  | 'pool_created'
  | 'meeting_started'
  | 'pool_creation_error'
  | 'worker_job_received'
  | 'worker_job_error'
  | 'meeting_loop_exit'
  | 'lock_skipped'
  | 'agent_turn_start'
  | 'agent_llm_start'
  | 'agent_stream_timeout'
  | 'agent_turn_error'
  | 'agent_turn_complete'
  | 'relevance_check'
  | 'agent_queued'
  | 'stop_signal_detected'
  | 'force_round_robin'
  | 'max_empty_rounds'
  | 'wrapup_start'
  | 'wrapup_complete'
  | 'wrapup_error'
  | 'meeting_completed'
  | 'user_message'
  | 'zombie_recovery';

export type MeetingLogLevel = 'info' | 'warn' | 'error';

export interface MeetingLogDocument extends Document {
  poolId: string;
  event: MeetingEvent;
  level: MeetingLogLevel;
  message: string;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

const MEETING_EVENTS: MeetingEvent[] = [
  'pool_created', 'meeting_started', 'pool_creation_error',
  'worker_job_received', 'worker_job_error',
  'meeting_loop_exit', 'lock_skipped',
  'agent_turn_start', 'agent_llm_start',
  'agent_stream_timeout', 'agent_turn_error', 'agent_turn_complete',
  'relevance_check', 'agent_queued',
  'stop_signal_detected', 'force_round_robin', 'max_empty_rounds',
  'wrapup_start', 'wrapup_complete', 'wrapup_error', 'meeting_completed',
  'user_message', 'zombie_recovery',
];

const MeetingLogSchema = new Schema(
  {
    poolId:  { type: String, required: true },
    event:   { type: String, required: true, enum: MEETING_EVENTS },
    level:   { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, required: true },
    data:    { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MeetingLogSchema.index({ poolId: 1, createdAt: -1 });  // Primary: query all logs of 1 meeting
MeetingLogSchema.index({ event: 1, createdAt: -1 });   // Filter by event type across meetings
MeetingLogSchema.index({ level: 1 });                   // Error dashboard queries

export const MeetingLog = mongoose.model<MeetingLogDocument>('MeetingLog', MeetingLogSchema);
