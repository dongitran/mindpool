import { Router } from 'express';
import * as poolService from '../services/pool.service';
import * as mindxService from '../services/mindx.service';
import { redis, MEETING_QUEUE_KEY } from '../lib/redis';
import { logger } from '../lib/logger';
import { validate } from '../middleware/validate';
import { createPoolSchema, sendMessageSchema } from '../schemas/pool.schema';

const router = Router();

// POST /pool/create — create pool from topic + agentIds
router.post('/pool/create', validate(createPoolSchema), async (req, res, next) => {
  try {
    const { topic, agentIds, conversationId } = req.body;

    const pool = await poolService.createPool(topic, agentIds, conversationId || '');
    const poolId = pool._id.toString();

    // Generate opening announcement (sync — needed before loop starts)
    await mindxService.generateAnnouncement(poolId);

    // Select opening agent and seed the in-memory queue
    const agents = pool.agents.map((a) => ({
      agentId: a.agentId,
      name: a.name,
      specialty: a.role,
    }));
    const openingAgent = await mindxService.selectOpeningAgent(topic, agents);
    mindxService.getQueueManager(poolId).addToQueue(openingAgent.agentId);

    // Enqueue meeting loop job — worker picks it up via BLPOP
    await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
    logger.info('Meeting loop enqueued', { poolId });

    res.status(201).json(pool);
  } catch (error) {
    next(error);
  }
});

// GET /pool/:id — get pool details
router.get('/pool/:id', async (req, res, next) => {
  try {
    const pool = await poolService.getPool(req.params.id as string);
    if (!pool) {
      res.status(404).json({ error: { message: 'Pool not found' } });
      return;
    }
    res.json(pool);
  } catch (error) {
    next(error);
  }
});

// GET /pools — list all pools
router.get('/pools', async (_req, res, next) => {
  try {
    const pools = await poolService.listPools();
    res.json(pools);
  } catch (error) {
    next(error);
  }
});

// POST /pool/:id/message — user sends a message in an active meeting
router.post('/pool/:id/message', validate(sendMessageSchema), async (req, res, next) => {
  try {
    const content = req.body.content as string;

    const poolId = req.params.id as string;
    const pool = await poolService.getPool(poolId);
    if (!pool) {
      res.status(404).json({ error: { message: 'Pool not found' } });
      return;
    }

    // Persist user message
    const message = await poolService.addMessage(poolId, { agentId: 'user', content });

    // Update stop detector with user message (same process — in-memory is fine)
    mindxService.getStopDetector(poolId).checkUserTrigger(content);

    // Enqueue next meeting loop round
    await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
    logger.info('Meeting loop enqueued (user message)', { poolId });

    res.json(message);
  } catch (error) {
    next(error);
  }
});

export { router as poolRouter };
