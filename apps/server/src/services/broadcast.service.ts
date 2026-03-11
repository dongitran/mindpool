import { sendSSEToPool } from '../lib/pubsub';

export const broadcastService = {
    async broadcastAnnouncement(poolId: string, announcement: string) {
        await sendSSEToPool(poolId, { type: 'mindx_announce', content: announcement });
    },

    async broadcastPoolComplete(poolId: string, wrapUp: string) {
        await sendSSEToPool(poolId, { type: 'pool_complete', wrapUp, status: 'completed' });
    },

    async broadcastQueueUpdate(poolId: string, queue: { agentId: string; position: number }[]) {
        await sendSSEToPool(poolId, { type: 'queue_update', queue });
    },

    async broadcastAgentState(poolId: string, agentId: string, state: string) {
        await sendSSEToPool(poolId, { type: 'agent_state', agentId, state });
    },

    async broadcastAgentTyping(
        poolId: string,
        agentId: string,
        agentName: string,
        icon: string,
        role: string
    ) {
        await sendSSEToPool(poolId, {
            type: 'agent_typing',
            agentId,
            agentName,
            icon,
            role,
        });
    },

    async broadcastAgentMessage(
        poolId: string,
        agentId: string,
        agentName: string,
        icon: string,
        content: string,
        thinkSec: number,
        thinking?: string
    ) {
        await sendSSEToPool(poolId, {
            type: 'agent_message',
            agentId,
            agentName,
            icon,
            content,
            thinkSec,
            thinking,
        });
    },

    async broadcastAgentChunk(
        poolId: string,
        agentId: string,
        agentName: string,
        icon: string,
        chunk: string
    ) {
        await sendSSEToPool(poolId, {
            type: 'agent_chunk',
            agentId,
            agentName,
            icon,
            chunk,
        });
    },

    async broadcastAgentDone(poolId: string, agentId: string) {
        await sendSSEToPool(poolId, { type: 'agent_done', agentId });
    },

    async broadcastError(poolId: string, message: string) {
        await sendSSEToPool(poolId, { type: 'error', message });
    },

    async broadcastAgentThinking(
        poolId: string,
        agentId: string,
        agentName: string,
        content: string,
        thinkSec: number
    ) {
        await sendSSEToPool(poolId, {
            type: 'agent_thinking',
            agentId,
            agentName,
            content,
            thinkSec,
        });
    },

    async broadcastAgentStopTyping(poolId: string, agentId: string) {
        await sendSSEToPool(poolId, { type: 'agent_stop_typing', agentId });
    },
};
