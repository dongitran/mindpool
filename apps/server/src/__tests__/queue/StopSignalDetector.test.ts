import { describe, it, expect, beforeEach } from 'vitest';
import { StopSignalDetector } from '../../queue/StopSignalDetector';

describe('StopSignalDetector', () => {
  let detector: StopSignalDetector;

  beforeEach(() => {
    detector = new StopSignalDetector();
  });

  describe('shouldStop', () => {
    it('should not stop when no signals are set', () => {
      expect(detector.shouldStop()).toBe(false);
    });

    it('should not stop when only queueEmpty is true', () => {
      detector.checkQueueEmpty(0);
      expect(detector.shouldStop()).toBe(false);
    });

    it('should not stop when only userTrigger is true', () => {
      detector.checkUserTrigger('cảm ơn');
      expect(detector.shouldStop()).toBe(false);
    });

    it('should stop when both queueEmpty AND userTrigger are true', () => {
      detector.checkQueueEmpty(0);
      detector.checkUserTrigger('cảm ơn');
      expect(detector.shouldStop()).toBe(true);
    });
  });

  describe('checkQueueEmpty', () => {
    it('should set queueEmpty=true when size is 0', () => {
      detector.checkQueueEmpty(0);
      expect(detector.getSignals().queueEmpty).toBe(true);
    });

    it('should set queueEmpty=false when size > 0', () => {
      detector.checkQueueEmpty(3);
      expect(detector.getSignals().queueEmpty).toBe(false);
    });

    it('should update dynamically as queue changes', () => {
      detector.checkQueueEmpty(0);
      expect(detector.getSignals().queueEmpty).toBe(true);
      detector.checkQueueEmpty(2);
      expect(detector.getSignals().queueEmpty).toBe(false);
    });
  });

  describe('checkUserTrigger', () => {
    it.each([
      ['okay', true],
      ['cảm ơn', true],
      ['đủ rồi', true],
      ['kết thúc', true],
      ['OKAY thanks', true],
      ['Cảm Ơn mọi người', true],
      ['tiếp tục thảo luận', false],
      ['tôi nghĩ rằng', false],
      ['', false],
    ])('"%s" → userTrigger=%s', (message, expected) => {
      detector.checkUserTrigger(message);
      expect(detector.getSignals().userTrigger).toBe(expected);
    });

    it('should be case-insensitive', () => {
      detector.checkUserTrigger('OKAY');
      expect(detector.getSignals().userTrigger).toBe(true);
    });

    it('should match substrings', () => {
      detector.checkUserTrigger('vâng okay rồi nhé');
      expect(detector.getSignals().userTrigger).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all signals', () => {
      detector.checkQueueEmpty(0);
      detector.checkUserTrigger('okay');
      expect(detector.shouldStop()).toBe(true);

      detector.reset();
      expect(detector.shouldStop()).toBe(false);
      expect(detector.getSignals()).toEqual({ queueEmpty: false, userTrigger: false });
    });
  });

  describe('getSignals', () => {
    it('should return a copy (not a reference)', () => {
      const signals = detector.getSignals();
      signals.queueEmpty = true;
      expect(detector.getSignals().queueEmpty).toBe(false);
    });
  });
});
