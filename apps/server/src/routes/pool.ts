import { Router } from 'express';
import { poolService } from '../di';
import * as mindxService from '../services/mindx.service';
import { redis, MEETING_QUEUE_KEY } from '../lib/redis';
import { logger } from '../lib/logger';
import { logMeetingInfo, logMeetingError } from '../lib/meetingLogger';
import { validate } from '../middleware/validate';
import { createPoolSchema, sendMessageSchema } from '@mindpool/shared';

const router = Router();

// POST /pool/create — create pool from topic + agentIds
router.post('/pool/create', validate(createPoolSchema), async (req, res, next) => {
  try {
    const { topic, agentIds, conversationId } = req.body;
    logger.info('Pool creation request received', { topic, agentCount: agentIds?.length, conversationId });

    const pool = await poolService.createPool(topic, agentIds, conversationId || '');
    const poolId = pool._id.toString();

    logMeetingInfo(poolId, 'pool_created', 'Pool document created', {
      topic,
      agentCount: agentIds?.length,
      conversationId: conversationId || null,
    });

    try {
      // Generate opening announcement (sync — needed before loop starts)
      await mindxService.generateAnnouncement(poolId);

      // Select opening agent and seed the in-memory queue
      const agents = pool.agents.map((a: { agentId: string; name: string; role?: string }) => ({
        agentId: a.agentId,
        name: a.name,
        specialty: a.role || '',
      }));
      const openingAgent = await mindxService.selectOpeningAgent(topic, agents);
      if (openingAgent) {
        // Await the queue operation to fix unhandled floating promise
        await mindxService.getQueueManager(poolId).addToQueue(openingAgent.agentId);
      }

      // Enqueue meeting loop job — worker picks it up via BLPOP
      await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
      logger.info('Meeting loop enqueued', { poolId });
      logMeetingInfo(poolId, 'meeting_started', 'Meeting loop enqueued', {
        openingAgentId: openingAgent?.agentId ?? null,
      });

      res.status(201).json(pool);
      logger.info('Pool created successfully', { poolId, topic });
    } catch (innerError) {
      logger.error('Failed to initialize pool post-creation. Rolling back MongoDB...', { poolId, error: innerError });
      logMeetingError(poolId, 'pool_creation_error', 'Pool initialization failed, rolling back', {
        error: innerError instanceof Error ? innerError.message : String(innerError),
      });
      try {
        const { Pool } = await import('../models/Pool.js');
        await Pool.findByIdAndDelete(poolId);
      } catch (rollbackError) {
        logger.error('CRITICAL: Rollback failed. Zombie pool exists in DB.', { poolId, error: rollbackError });
      }
      throw innerError;
    }
  } catch (error) {
    logger.error('Pool creation endpoint failed', { error, body: req.body });
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
    await mindxService.getStopDetector(poolId).checkUserTrigger(content);
    const stopKeywordDetected = ['okay', 'cảm ơn', 'đủ rồi', 'kết thúc'].some((kw) =>
      content.toLowerCase().includes(kw)
    );
    logMeetingInfo(poolId, 'user_message', 'User message received', {
      contentLength: content.length,
      stopKeywordDetected,
    });

    // Enqueue next meeting loop round
    await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
    logger.info('Meeting loop enqueued (user message)', { poolId });

    res.json(message);
  } catch (error) {
    next(error);
  }
});

export { router as poolRouter };
