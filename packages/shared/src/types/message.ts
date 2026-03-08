export interface Message {
  _id: string;
  poolId: string;
  agentId: string;  // agentId | 'user' | 'mindx'
  thinking: string | null;
  thinkSec: number | null;
  content: string;
  replyTo: string | null;  // stub for Phase 2
  timestamp: string;
}
