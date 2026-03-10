import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    defaultModel: z.enum(['kimi-k2', 'kimi-k2.5', 'minimax-m2.5']).optional(),
    thinkingBudget: z.number().min(3).max(30).optional(),
    autoStartDiscussion: z.boolean().optional(),
    showThinkingDefault: z.boolean().optional(),
    mindxEnabled: z.boolean().optional(),
    autoRecap: z.boolean().optional(),
    maxAgentsPerPool: z.number().min(2).max(10).optional(),
    compactSidebar: z.boolean().optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'must be a valid hex color')
      .optional(),
    apiKeys: z
      .object({
        kimi: z.string().max(200).optional(),
        minimax: z.string().max(200).optional(),
      })
      .optional(),
  })
  .strict();
