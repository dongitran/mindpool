import { Router } from 'express';
import type { Request, Response } from 'express';
import { Message } from '../models';

const router = Router();

// Active SSE connections per pool
const poolConnections = new Map<string, Set<Response>>();

export function sendSSEToPool(poolId: string, event: object): void {
  const connections = poolConnections.get(poolId);
  if (!connections) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of connections) {
    res.write(data);
  }
}

// GET /stream/:poolId — SSE connection
router.get('/:poolId', (req: Request<{ poolId: string }>, res: Response) => {
  const poolId = req.params.poolId;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', poolId })}\n\n`);

  // Register connection
  if (!poolConnections.has(poolId)) {
    poolConnections.set(poolId, new Set());
  }
  poolConnections.get(poolId)!.add(res);

  // Send existing messages
  Message.find({ poolId })
    .sort({ timestamp: 1 })
    .then((messages) => {
      for (const msg of messages) {
        res.write(
          `data: ${JSON.stringify({ type: 'message', message: msg })}\n\n`
        );
      }
    })
    .catch((err) => {
      console.error('[SSE] Error fetching messages:', err);
    });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30_000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(heartbeat);
    const connections = poolConnections.get(poolId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        poolConnections.delete(poolId);
      }
    }
  });
});

export { router as streamRouter };
