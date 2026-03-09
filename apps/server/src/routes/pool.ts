import { Router } from 'express';
import * as poolService from '../services/pool.service';
import * as mindxService from '../services/mindx.service';
import { logger } from '../lib/logger';

const router = Router();

// POST /pool/create — create pool from topic + agentIds
router.post('/pool/create', async (req, res, next) => {
  try {
    const { topic, agentIds, conversationId } = req.body;

    if (!topic || !agentIds?.length) {
      res.status(400).json({ error: { message: 'topic and agentIds are required' } });
      return;
    }

    const pool = await poolService.createPool(topic, agentIds, conversationId || '');

    // Generate opening announcement
    await mindxService.generateAnnouncement(pool._id.toString());

    // Select opening agent and start the meeting loop
    const agents = pool.agents.map((a) => ({
      agentId: a.agentId,
      name: a.name,
      specialty: a.role,
    }));

    const openingAgent = await mindxService.selectOpeningAgent(topic, agents);

    // Add opening agent to queue
    const queueManager = mindxService.getQueueManager(pool._id.toString());
    queueManager.addToQueue(openingAgent.agentId);

    // Kick off the first turn
    mindxService.handleMeetingLoop(pool._id.toString()).catch((err) => {
      logger.error('Meeting loop error', { error: err });
    });

    res.status(201).json(pool);
  } catch (error) {
    next(error);
  }
});

// GET /pool/:id — get pool details
router.get('/pool/:id', async (req, res, next) => {
  try {
    const pool = await poolService.getPool(req.params.id);
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

// POST /pool/:id/message — user sends message in meeting
router.post('/pool/:id/message', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: { message: 'content is required' } });
      return;
    }

    const poolId = req.params.id;
    const pool = await poolService.getPool(poolId);
    if (!pool) {
      res.status(404).json({ error: { message: 'Pool not found' } });
      return;
    }

    // Add user message
    const message = await poolService.addMessage(poolId, {
      agentId: 'user',
      content,
    });

    // Check stop signals
    const stopDetector = mindxService.getStopDetector(poolId);
    stopDetector.checkUserTrigger(content);

    // Trigger next round of the meeting loop
    mindxService.handleMeetingLoop(poolId).catch((err) => {
      logger.error('Meeting loop error', { error: err });
    });

    res.json(message);
  } catch (error) {
    next(error);
  }
});

export { router as poolRouter };
