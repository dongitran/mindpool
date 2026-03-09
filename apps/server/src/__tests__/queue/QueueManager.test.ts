import { describe, it, expect, beforeEach } from 'vitest';
import { QueueManager } from '../../queue/QueueManager';

describe('QueueManager', () => {
  let queue: QueueManager;

  beforeEach(() => {
    queue = new QueueManager();
  });

  describe('addToQueue', () => {
    it('should add an agent and return true', () => {
      expect(queue.addToQueue('agent-1')).toBe(true);
      expect(queue.getSize()).toBe(1);
    });

    it('should reject duplicate agents', () => {
      queue.addToQueue('agent-1');
      expect(queue.addToQueue('agent-1')).toBe(false);
      expect(queue.getSize()).toBe(1);
    });

    it('should enforce maxDepth of 4', () => {
      queue.addToQueue('agent-1');
      queue.addToQueue('agent-2');
      queue.addToQueue('agent-3');
      queue.addToQueue('agent-4');
      expect(queue.addToQueue('agent-5')).toBe(false);
      expect(queue.getSize()).toBe(4);
    });
  });

  describe('popFromQueue', () => {
    it('should return null when empty', () => {
      expect(queue.popFromQueue()).toBeNull();
    });

    it('should pop in FIFO order', () => {
      queue.addToQueue('agent-1');
      queue.addToQueue('agent-2');
      queue.addToQueue('agent-3');

      expect(queue.popFromQueue()).toBe('agent-1');
      expect(queue.popFromQueue()).toBe('agent-2');
      expect(queue.popFromQueue()).toBe('agent-3');
      expect(queue.popFromQueue()).toBeNull();
    });

    it('should allow re-adding after pop', () => {
      queue.addToQueue('agent-1');
      queue.popFromQueue();
      expect(queue.addToQueue('agent-1')).toBe(true);
    });
  });

  describe('getQueue', () => {
    it('should return agents with 1-based positions', () => {
      queue.addToQueue('agent-a');
      queue.addToQueue('agent-b');

      expect(queue.getQueue()).toEqual([
        { agentId: 'agent-a', position: 1 },
        { agentId: 'agent-b', position: 2 },
      ]);
    });

    it('should return empty array when queue is empty', () => {
      expect(queue.getQueue()).toEqual([]);
    });
  });

  describe('isInQueue', () => {
    it('should return false for absent agent', () => {
      expect(queue.isInQueue('agent-1')).toBe(false);
    });

    it('should return true for present agent', () => {
      queue.addToQueue('agent-1');
      expect(queue.isInQueue('agent-1')).toBe(true);
    });

    it('should return false after agent is popped', () => {
      queue.addToQueue('agent-1');
      queue.popFromQueue();
      expect(queue.isInQueue('agent-1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      queue.addToQueue('agent-1');
      queue.addToQueue('agent-2');
      queue.clear();
      expect(queue.getSize()).toBe(0);
      expect(queue.getQueue()).toEqual([]);
    });
  });

  describe('isFull', () => {
    it('should return false when under capacity', () => {
      queue.addToQueue('agent-1');
      expect(queue.isFull()).toBe(false);
    });

    it('should return true at max capacity', () => {
      queue.addToQueue('agent-1');
      queue.addToQueue('agent-2');
      queue.addToQueue('agent-3');
      queue.addToQueue('agent-4');
      expect(queue.isFull()).toBe(true);
    });
  });
});
