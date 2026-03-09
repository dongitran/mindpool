import type { AgentState } from '@mindpool/shared';
import { Pool, Agent, Message } from '../models';

export async function createPool(
  topic: string,
  agentIds: string[],
  conversationId: string
) {
  // Fetch agent docs to build AgentRef array
  const agentDocs = await Agent.find({ _id: { $in: agentIds } });

  const agentRefs = agentDocs.map((a) => ({
    agentId: a._id.toString(),
    icon: a.icon,
    name: a.name,
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
    sendAgents: agentRefs.map((a) => ({
      icon: a.icon,
      name: a.name,
      role: a.role,
    })),
    mapCenter: topic.slice(0, 30),
    mapCenterSub: '',
    mapNodes: [],
  });

  return pool;
}

export async function getPool(id: string) {
  return Pool.findById(id).populate('messages');
}

export async function listPools() {
  return Pool.find().sort({ updatedAt: -1 });
}

export async function updatePoolStatus(
  id: string,
  status: 'setup' | 'active' | 'completed'
) {
  return Pool.findByIdAndUpdate(id, { status }, { new: true });
}

export async function updateAgentState(
  poolId: string,
  agentId: string,
  state: AgentState
) {
  return Pool.findByIdAndUpdate(
    poolId,
    { $set: { 'agents.$[elem].state': state } },
    { arrayFilters: [{ 'elem.agentId': agentId }], new: true }
  );
}

export async function addMessage(
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
}
