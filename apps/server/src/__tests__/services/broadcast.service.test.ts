import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/redis', () => ({
  redis: {
    publish: vi.fn().mockResolvedValue(1),
  },
}));

import { broadcastService } from '../../services/broadcast.service';
import { redis } from '../../lib/redis';

describe('broadcastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.publish).mockResolvedValue(1);
  });

  it('broadcastAnnouncement publishes mindx_announce event', async () => {
    await broadcastService.broadcastAnnouncement('pool-1', 'Meeting started!');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'mindx_announce', content: 'Meeting started!' })
    );
  });

  it('broadcastPoolComplete publishes pool_complete event', async () => {
    await broadcastService.broadcastPoolComplete('pool-1', 'Summary text');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'pool_complete', wrapUp: 'Summary text', status: 'completed' })
    );
  });

  it('broadcastQueueUpdate publishes queue_update event', async () => {
    const queue = [
      { agentId: 'a1', position: 1 },
      { agentId: 'a2', position: 2 },
    ];

    await broadcastService.broadcastQueueUpdate('pool-1', queue);

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'queue_update', queue })
    );
  });

  it('broadcastAgentState publishes agent_state event', async () => {
    await broadcastService.broadcastAgentState('pool-1', 'agent-1', 'speaking');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'agent_state', agentId: 'agent-1', state: 'speaking' })
    );
  });

  it('broadcastAgentTyping publishes agent_typing event', async () => {
    await broadcastService.broadcastAgentTyping('pool-1', 'agent-1', 'Business', '💼', 'Analyst');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({
        type: 'agent_typing',
        agentId: 'agent-1',
        agentName: 'Business',
        icon: '💼',
        role: 'Analyst',
      })
    );
  });

  it('broadcastAgentMessage publishes agent_message event', async () => {
    await broadcastService.broadcastAgentMessage(
      'pool-1', 'agent-1', 'Business', '💼', 'My analysis...', 5.2
    );

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({
        type: 'agent_message',
        agentId: 'agent-1',
        agentName: 'Business',
        icon: '💼',
        content: 'My analysis...',
        thinkSec: 5.2,
      })
    );
  });

  it('broadcastAgentThinking publishes agent_thinking event', async () => {
    await broadcastService.broadcastAgentThinking(
      'pool-1', 'agent-1', 'Business', 'Thinking about strategy...', 3
    );

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({
        type: 'agent_thinking',
        agentId: 'agent-1',
        agentName: 'Business',
        content: 'Thinking about strategy...',
        thinkSec: 3,
      })
    );
  });

  it('broadcastAgentStopTyping publishes agent_stop_typing event', async () => {
    await broadcastService.broadcastAgentStopTyping('pool-1', 'agent-1');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'agent_stop_typing', agentId: 'agent-1' })
    );
  });

  it('broadcastAgentDone publishes agent_done event', async () => {
    await broadcastService.broadcastAgentDone('pool-1', 'agent-1');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'agent_done', agentId: 'agent-1' })
    );
  });

  it('broadcastError publishes error event', async () => {
    await broadcastService.broadcastError('pool-1', 'Agent failed');

    expect(redis.publish).toHaveBeenCalledWith(
      'sse:pool:pool-1',
      JSON.stringify({ type: 'error', message: 'Agent failed' })
    );
  });

  it('all broadcasts use correct Redis channel format', async () => {
    await broadcastService.broadcastAnnouncement('my-pool-id', 'test');

    expect(vi.mocked(redis.publish).mock.calls[0][0]).toBe('sse:pool:my-pool-id');
  });
});
