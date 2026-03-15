import { describe, it, expect, beforeEach } from 'vitest';
import { useMeetingStore } from '../../stores/meetingStore';

describe('meetingStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useMeetingStore.getState().reset();
  });

  describe('addMessage', () => {
    it('should add a message with auto-generated id', () => {
      const store = useMeetingStore.getState();
      store.addMessage({
        type: 'user',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
      });

      const messages = useMeetingStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].id).toBeDefined();
    });

    it('should preserve provided id', () => {
      const store = useMeetingStore.getState();
      store.addMessage({
        id: 'custom-id',
        type: 'user',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(useMeetingStore.getState().messages[0].id).toBe('custom-id');
    });

    it('should remove typing indicator when agent message arrives', () => {
      const store = useMeetingStore.getState();

      // Add typing indicator
      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        agentName: 'Business',
        icon: '💼',
        content: '',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(useMeetingStore.getState().messages).toHaveLength(1);
      expect(useMeetingStore.getState().messages[0].type).toBe('typing');

      // Add actual agent message
      store.addMessage({
        type: 'agent',
        agentId: 'agent-1',
        agentName: 'Business',
        content: 'My analysis...',
        timestamp: '2024-01-01T00:00:01Z',
      });

      const messages = useMeetingStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('agent');
      expect(messages[0].content).toBe('My analysis...');
    });

    it('should inherit thinking data from typing indicator', () => {
      const store = useMeetingStore.getState();

      // Add typing with thinking
      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        agentName: 'Business',
        icon: '💼',
        role: 'Analyst',
        content: '',
        thinking: 'Deep analysis...',
        thinkSec: 5,
        timestamp: '2024-01-01T00:00:00Z',
      });

      // Agent message arrives without thinking (inherits from typing)
      store.addMessage({
        type: 'agent',
        agentId: 'agent-1',
        agentName: 'Business',
        content: 'My analysis...',
        timestamp: '2024-01-01T00:00:05Z',
      });

      const msg = useMeetingStore.getState().messages[0];
      expect(msg.thinking).toBe('Deep analysis...');
      expect(msg.thinkSec).toBe(5);
      expect(msg.icon).toBe('💼');
      expect(msg.role).toBe('Analyst');
    });

    it('should NOT remove typing for different agent', () => {
      const store = useMeetingStore.getState();

      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        content: '',
        timestamp: '2024-01-01T00:00:00Z',
      });

      store.addMessage({
        type: 'agent',
        agentId: 'agent-2',
        content: 'Different agent',
        timestamp: '2024-01-01T00:00:01Z',
      });

      const messages = useMeetingStore.getState().messages;
      expect(messages).toHaveLength(2);
    });

    it('should not remove typing for user messages', () => {
      const store = useMeetingStore.getState();

      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        content: '',
        timestamp: '2024-01-01T00:00:00Z',
      });

      store.addMessage({
        type: 'user',
        content: 'User message',
        timestamp: '2024-01-01T00:00:01Z',
      });

      expect(useMeetingStore.getState().messages).toHaveLength(2);
    });
  });

  describe('updateTypingMessage', () => {
    it('should update thinking data on typing message', () => {
      const store = useMeetingStore.getState();

      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        agentName: 'Business',
        content: '',
        timestamp: '2024-01-01T00:00:00Z',
      });

      store.updateTypingMessage('agent-1', 'Analyzing market trends...', 3);

      const msg = useMeetingStore.getState().messages[0];
      expect(msg.thinking).toBe('Analyzing market trends...');
      expect(msg.thinkSec).toBe(3);
    });

    it('should not affect non-typing messages', () => {
      const store = useMeetingStore.getState();

      store.addMessage({
        type: 'agent',
        agentId: 'agent-1',
        content: 'Original content',
        timestamp: '2024-01-01T00:00:00Z',
      });

      store.updateTypingMessage('agent-1', 'thinking', 5);

      const msg = useMeetingStore.getState().messages[0];
      expect(msg.thinking).toBeUndefined();
    });

    it('should only update the correct agent typing message', () => {
      const store = useMeetingStore.getState();

      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        content: '',
        timestamp: '2024-01-01T00:00:00Z',
      });

      store.addMessage({
        type: 'typing',
        agentId: 'agent-2',
        content: '',
        timestamp: '2024-01-01T00:00:01Z',
      });

      store.updateTypingMessage('agent-1', 'thinking...', 2);

      const messages = useMeetingStore.getState().messages;
      expect(messages[0].thinking).toBe('thinking...');
      expect(messages[1].thinking).toBeUndefined();
    });
  });

  describe('updateAgentState', () => {
    it('should set agent state', () => {
      const store = useMeetingStore.getState();

      store.updateAgentState('agent-1', 'speaking');

      expect(useMeetingStore.getState().agentStates['agent-1']).toBe('speaking');
    });

    it('should update existing agent state', () => {
      const store = useMeetingStore.getState();

      store.updateAgentState('agent-1', 'speaking');
      store.updateAgentState('agent-1', 'listening');

      expect(useMeetingStore.getState().agentStates['agent-1']).toBe('listening');
    });

    it('should not affect other agents states', () => {
      const store = useMeetingStore.getState();

      store.updateAgentState('agent-1', 'speaking');
      store.updateAgentState('agent-2', 'queued');

      const states = useMeetingStore.getState().agentStates;
      expect(states['agent-1']).toBe('speaking');
      expect(states['agent-2']).toBe('queued');
    });
  });

  describe('updateQueue', () => {
    it('should replace queue with new data', () => {
      const store = useMeetingStore.getState();

      const queue = [
        { agentId: 'a1', position: 1 },
        { agentId: 'a2', position: 2 },
      ];

      store.updateQueue(queue);

      expect(useMeetingStore.getState().queue).toEqual(queue);
    });

    it('should handle empty queue', () => {
      const store = useMeetingStore.getState();

      store.updateQueue([{ agentId: 'a1', position: 1 }]);
      store.updateQueue([]);

      expect(useMeetingStore.getState().queue).toEqual([]);
    });
  });

  describe('setPoolComplete', () => {
    it('should mark pool as completed and add wrap-up message', () => {
      const store = useMeetingStore.getState();

      store.setCurrentPool('pool-1', {
        _id: 'pool-1',
        title: 'Test',
        topic: 'Test topic',
        status: 'active',
        agents: [],
        messages: [],
        queue: [],
        conversationId: '',
        statusText: '',
        duration: 0,
        sendAgents: [],
        mapCenter: '',
        mapCenterSub: '',
        mapNodes: [],
        createdAt: '',
        updatedAt: '',
      });

      store.setPoolComplete('This is the summary');

      const state = useMeetingStore.getState();
      expect(state.pool?.status).toBe('completed');
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].type).toBe('mindx');
      expect(state.messages[0].content).toBe('This is the summary');
    });

    it('should handle null pool gracefully', () => {
      const store = useMeetingStore.getState();

      store.setPoolComplete('Summary');

      const state = useMeetingStore.getState();
      expect(state.pool).toBeNull();
      expect(state.messages).toHaveLength(1);
    });
  });

  describe('setCurrentPool', () => {
    const makePool = (id: string, topic = 'Test topic') => ({
      _id: id,
      title: 'Test',
      topic,
      status: 'active' as const,
      agents: [],
      messages: [],
      queue: [],
      conversationId: '',
      statusText: '',
      duration: 0,
      sendAgents: [],
      mapCenter: '',
      mapCenterSub: '',
      mapNodes: [],
      createdAt: '',
      updatedAt: '',
    });

    it('should set pool and reset messages when switching pools', () => {
      const store = useMeetingStore.getState();

      // Set initial pool
      store.setCurrentPool('pool-1', makePool('pool-1'));

      // Add existing message
      store.addMessage({
        type: 'user',
        content: 'old',
        timestamp: '2024-01-01T00:00:00Z',
      });

      // Switch to different pool
      store.setCurrentPool('pool-2', makePool('pool-2', 'New topic'));

      const state = useMeetingStore.getState();
      expect(state.currentPoolId).toBe('pool-2');
      expect(state.pool?.topic).toBe('New topic');
      expect(state.messages).toHaveLength(0); // Messages wiped on pool switch
    });

    it('should NOT wipe messages on initial load (race condition fix)', () => {
      const store = useMeetingStore.getState();

      // Simulate SSE replay arriving BEFORE pool fetch resolves:
      // 1. SSE adds a typing indicator
      store.addMessage({
        type: 'typing',
        agentId: 'agent-1',
        agentName: 'Business',
        icon: '💼',
        content: '',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(useMeetingStore.getState().messages).toHaveLength(1);

      // 2. Pool fetch resolves → setCurrentPool called with currentPoolId=null
      store.setCurrentPool('pool-1', makePool('pool-1'));

      // Messages should NOT be wiped — SSE-replayed typing indicator preserved
      const state = useMeetingStore.getState();
      expect(state.currentPoolId).toBe('pool-1');
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].type).toBe('typing');
    });

    it('should NOT wipe messages when re-setting same pool', () => {
      const store = useMeetingStore.getState();
      const pool = makePool('pool-1');

      store.setCurrentPool('pool-1', pool);
      store.addMessage({
        type: 'agent',
        agentId: 'agent-1',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
      });

      // Same pool re-set (e.g. refetch)
      store.setCurrentPool('pool-1', pool);

      expect(useMeetingStore.getState().messages).toHaveLength(1);
    });

    it('should wipe messages when switching to a DIFFERENT pool', () => {
      const store = useMeetingStore.getState();

      store.setCurrentPool('pool-1', makePool('pool-1'));
      store.addMessage({
        type: 'agent',
        agentId: 'agent-1',
        content: 'Hello from pool 1',
        timestamp: '2024-01-01T00:00:00Z',
      });
      store.updateAgentState('agent-1', 'speaking');
      store.updateQueue([{ agentId: 'agent-1', position: 1 }]);

      // Switch to different pool
      store.setCurrentPool('pool-2', makePool('pool-2'));

      const state = useMeetingStore.getState();
      expect(state.messages).toHaveLength(0);
      expect(state.streamingChunks).toEqual({});
      expect(state.agentStates).toEqual({});
      expect(state.queue).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = useMeetingStore.getState();

      store.addMessage({ type: 'user', content: 'test', timestamp: 'now' });
      store.updateAgentState('a1', 'speaking');
      store.updateQueue([{ agentId: 'a1', position: 1 }]);

      store.reset();

      const state = useMeetingStore.getState();
      expect(state.currentPoolId).toBeNull();
      expect(state.pool).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.agentStates).toEqual({});
      expect(state.queue).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });
});
