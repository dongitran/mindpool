import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().max(200, 'title must be under 200 characters').optional(),
});

export const sendConversationMessageSchema = z.object({
  content: z.string().min(1, 'content is required').max(5000, 'content must be under 5000 characters'),
});
