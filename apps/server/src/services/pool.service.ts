import type { AgentState, Pool as SharedPool } from '@mindpool/shared';
import type { Model } from 'mongoose';
import type { PoolDocument, AgentDocument, MessageDocument } from '../models';
import { parseCursorFilter, buildCursor } from '../lib/pagination';

export function mapPoolDocToShared(doc: PoolDocument): SharedPool {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    topic: doc.topic,
    status: doc.status,
    agents: doc.agents.map((a) => ({
      agentId: a.agentId,
      icon: a.icon,
      name: a.name,
      role: a.role,
      state: a.state as 'speaking' | 'queued' | 'listening',
      queuePosition: a.queuePosition,
    })),
    messages: doc.messages.map((m) => m.toString()),
    queue: doc.queue,
    conversationId: doc.conversationId,
    statusText: doc.statusText,
    duration: doc.duration,
    sendAgents: doc.sendAgents.map((sa) => ({
      icon: sa.icon,
      name: sa.name,
      role: sa.role,
    })),
    mapCenter: doc.mapCenter,
    mapCenterSub: doc.mapCenterSub,
    mapNodes: doc.mapNodes.map((n) => ({
      label: n.label,
      sub: n.sub,
      val: n.val,
      color: n.color,
    })),
    createdAt: doc.get?.('createdAt')?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.get?.('updatedAt')?.toISOString?.() || new Date().toISOString(),
  };
}

export function buildPoolService({
  Pool,
  Agent,
  Message,
}: {
  Pool: Model<PoolDocument>;
  Agent: Model<AgentDocument>;
  Message: Model<MessageDocument>;
}) {
  return {
    async createPool(
      topic: string,
      agentIds: string[],
      conversationId: string
    ): Promise<SharedPool> {
      // Fetch agent docs to build AgentRef array
      const agentDocs = await Agent.find({ _id: { $in: agentIds } });

      const agentRefs = agentDocs.map((a: AgentDocument) => ({
        agentId: a._id.toString(),
        icon: a.icon || '',
        name: a.name || '',
        role: a.specialty,
        state: 'listening' as const,
      }));

      const pool = await Pool.create({
        title: topic.slice(0, 60),
        topic,
        status: 'active',
        agents: agentRefs,
        messages: [],
        queue: [],
        conversationId,
        statusText: 'Đang thảo luận...',
        duration: 0,
        sendAgents: agentRefs.map((a: { icon: string; name: string; role?: string }) => ({
          icon: a.icon,
          name: a.name,
          role: a.role || '',
        })),
        mapCenter: topic.slice(0, 30),
        mapCenterSub: '',
        mapNodes: [],
      });

      return mapPoolDocToShared(pool);
    },

    async getPool(id: string) {
      return Pool.findById(id).populate('messages');
    },

    async listPools(opts?: { limit?: number; cursor?: string }) {
      const limit = opts?.limit ?? 20;
      const filter = parseCursorFilter(opts?.cursor);
      const items = await Pool.find(filter).sort({ updatedAt: -1, _id: -1 }).limit(limit + 1);
      const hasMore = items.length > limit;
      if (hasMore) items.pop();
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: hasMore && last ? buildCursor(last) : null,
      };
    },

    async updatePoolStatus(
      id: string,
      status: 'setup' | 'active' | 'completed'
    ) {
      return Pool.findByIdAndUpdate(id, { status }, { new: true });
    },

    async updateAgentState(
      poolId: string,
      agentId: string,
      state: AgentState
    ) {
      return Pool.findByIdAndUpdate(
        poolId,
        { $set: { 'agents.$[elem].state': state } },
        { arrayFilters: [{ 'elem.agentId': agentId }], new: true }
      );
    },

    async addMessage(
      poolId: string,
      messageData: {
        agentId: string;
        content: string;
        thinking?: string | null;
        thinkSec?: number | null;
        replyTo?: string | null;
      }
    ) {
      const message = await Message.create({
        poolId,
        agentId: messageData.agentId,
        content: messageData.content,
        thinking: messageData.thinking ?? null,
        thinkSec: messageData.thinkSec ?? null,
        replyTo: messageData.replyTo ?? null,
      });

      await Pool.findByIdAndUpdate(poolId, {
        $push: { messages: message._id },
      });

      return message;
    },
  };
}
