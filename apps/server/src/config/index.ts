import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  mongoUri: process.env.MONGO_URI ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  kimiApiKey: process.env.KIMI_API_KEY ?? '',
  minimaxApiKey: process.env.MINIMAX_API_KEY ?? '',
  host: process.env.MINDPOOL_HOST ?? '',
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
  llmRouting: {
    fullResponse: {
      provider: process.env.LLM_FULL_RESPONSE_PROVIDER ?? '',
      model: process.env.LLM_FULL_RESPONSE_MODEL ?? '',
    },
    relevanceCheck: {
      provider: process.env.LLM_RELEVANCE_CHECK_PROVIDER ?? '',
      model: process.env.LLM_RELEVANCE_CHECK_MODEL ?? '',
    },
    recapSynthesis: {
      provider: process.env.LLM_RECAP_SYNTHESIS_PROVIDER ?? '',
      model: process.env.LLM_RECAP_SYNTHESIS_MODEL ?? '',
    },
  },
};
