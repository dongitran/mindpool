import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  KIMI_API_KEY: z.string().optional().default(''),
  MINIMAX_API_KEY: z.string().optional().default(''),
  MINDPOOL_HOST: z.string().optional().default(''),
  ENCRYPTION_KEY: z.string().optional().default(''),
  LLM_FULL_RESPONSE_PROVIDER: z.string().optional().default(''),
  LLM_FULL_RESPONSE_MODEL: z.string().optional().default(''),
  LLM_RELEVANCE_CHECK_PROVIDER: z.string().optional().default(''),
  LLM_RELEVANCE_CHECK_MODEL: z.string().optional().default(''),
  LLM_RECAP_SYNTHESIS_PROVIDER: z.string().optional().default(''),
  LLM_RECAP_SYNTHESIS_MODEL: z.string().optional().default(''),
  LOGS_MEETING_ENABLE: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = {
  port: parsedEnv.data.PORT,
  mongoUri: parsedEnv.data.MONGO_URI,
  redisUrl: parsedEnv.data.REDIS_URL,
  kimiApiKey: parsedEnv.data.KIMI_API_KEY,
  minimaxApiKey: parsedEnv.data.MINIMAX_API_KEY,
  host: parsedEnv.data.MINDPOOL_HOST,
  encryptionKey: parsedEnv.data.ENCRYPTION_KEY,
  logsMeetingEnable: parsedEnv.data.LOGS_MEETING_ENABLE,
  llmRouting: {
    fullResponse: {
      provider: parsedEnv.data.LLM_FULL_RESPONSE_PROVIDER,
      model: parsedEnv.data.LLM_FULL_RESPONSE_MODEL,
    },
    relevanceCheck: {
      provider: parsedEnv.data.LLM_RELEVANCE_CHECK_PROVIDER,
      model: parsedEnv.data.LLM_RELEVANCE_CHECK_MODEL,
    },
    recapSynthesis: {
      provider: parsedEnv.data.LLM_RECAP_SYNTHESIS_PROVIDER,
      model: parsedEnv.data.LLM_RECAP_SYNTHESIS_MODEL,
    },
  },
};
