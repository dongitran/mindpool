import { Router } from 'express';
import type { Request, Response } from 'express';
import { Message, Pool } from '../models';
import { logger } from '../lib/logger';
import { redisSub } from '../lib/redis';

const router = Router();

// poolId → Set of active SSE response objects
const poolConnections = new Map<string, Set<Response>>();

// Pool IDs we are currently subscribed to in Redis
const subscribedPools = new Set<string>();

// Forward Redis Pub/Sub messages to all SSE clients for that pool
redisSub.on('message', (channel: string, data: string) => {
  const poolId = channel.slice('sse:pool:'.length);
  const connections = poolConnections.get(poolId);
  if (!connections?.size) return;

  // We generate a timestamp for live events so the browser can use it as Last-Event-ID
  // If the event itself has a timestamp, we could parse it, but a current timestamp is usually fine for live events.
  const id = new Date().toISOString();
  const payload = `id: ${id}\ndata: ${data}\n\n`;
  for (const res of connections) {
    try {
      res.write(payload);
    } catch {
      // Client already disconnected
    }
  }
});

async function subscribePoolChannel(poolId: string): Promise<void> {
  if (!subscribedPools.has(poolId)) {
    await redisSub.subscribe(`sse:pool:${poolId}`);
    subscribedPools.add(poolId);
  }
}

async function maybeUnsubscribePoolChannel(poolId: string): Promise<void> {
  const connections = poolConnections.get(poolId);
  if (!connections || connections.size === 0) {
    subscribedPools.delete(poolId);
    await redisSub.unsubscribe(`sse:pool:${poolId}`);
  }
}

// GET /stream/:poolId — SSE connection
router.get('/:poolId', async (req: Request<{ poolId: string }>, res: Response) => {
  const { poolId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'connected', poolId })}\n\n`);

  // Register connection
  if (!poolConnections.has(poolId)) {
    poolConnections.set(poolId, new Set());
  }
  poolConnections.get(poolId)!.add(res);

  // Subscribe to Redis channel for this pool (no-op if already subscribed)
  await subscribePoolChannel(poolId);

  // Support native SSE Last-Event-ID header or legacy ?after query
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  const afterRaw = lastEventId || (req.query.after as string | undefined);
  const afterDate = afterRaw ? new Date(afterRaw) : null;
  const query =
    afterDate && !isNaN(afterDate.getTime())
      ? Message.find({ poolId, timestamp: { $gt: afterDate } })
      : Message.find({ poolId });

  try {
    // Fetch pool FIRST to build agent metadata map for message enrichment
    const pool = await Pool.findById(poolId);
    const agentMeta = new Map<string, { name: string; icon: string; role: string }>();
    if (pool) {
      for (const agent of pool.agents) {
        agentMeta.set(agent.agentId, { name: agent.name, icon: agent.icon, role: agent.role });
      }
    }

    const messages = await query.sort({ timestamp: 1 });
    for (const msg of messages) {
      // Enrich with agent metadata so replayed messages include name/icon/role
      const enriched = { ...msg.toObject(), } as Record<string, unknown>;
      const meta = agentMeta.get(msg.agentId);
      if (meta) {
        enriched.agentName = meta.name;
        enriched.icon = meta.icon;
        enriched.role = meta.role;
      }
      res.write(`id: ${msg.timestamp.toISOString()}\ndata: ${JSON.stringify({ type: 'message', message: enriched })}\n\n`);
    }

    // Send current agent states and queue so late-joining clients see correct state
    if (pool) {
      for (const agent of pool.agents) {
        if (agent.state === 'speaking') {
          // Send agent_typing so late-joining clients see the typing indicator in chat
          res.write(`data: ${JSON.stringify({
            type: 'agent_typing',
            agentId: agent.agentId,
            agentName: agent.name,
            icon: agent.icon,
            role: agent.role,
          })}\n\n`);
        } else if (agent.state && agent.state !== 'listening') {
          res.write(`data: ${JSON.stringify({ type: 'agent_state', agentId: agent.agentId, state: agent.state })}\n\n`);
        }
      }
      // Send queue state
      if (pool.queue && pool.queue.length > 0) {
        const queueData = pool.queue.map((agentId: string, i: number) => ({ agentId, position: i + 1 }));
        res.write(`data: ${JSON.stringify({ type: 'queue_update', queue: queueData })}\n\n`);
      }
    }
  } catch (err) {
    logger.error('SSE error fetching messages', { error: err });
  }

  // Heartbeat to keep connection alive through proxies/load balancers
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30_000);

  req.on('close', async () => {
    clearInterval(heartbeat);
    const connections = poolConnections.get(poolId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        poolConnections.delete(poolId);
      }
    }
    await maybeUnsubscribePoolChannel(poolId);
  });
});

export { router as streamRouter };
