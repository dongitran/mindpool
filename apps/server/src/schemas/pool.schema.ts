import { z } from 'zod';

export const createPoolSchema = z.object({
  topic: z.string().min(1, 'topic is required').max(500, 'topic must be under 500 characters'),
  agentIds: z
    .array(z.string().min(1))
    .min(1, 'at least 1 agent is required')
    .max(6, 'maximum 6 agents allowed'),
  conversationId: z.string().optional().default(''),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'content is required').max(5000, 'content must be under 5000 characters'),
});
