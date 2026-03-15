import { logger } from '../lib/logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetTimeoutMs: number;
  private readonly windowMs: number;

  constructor(opts?: { threshold?: number; resetTimeoutMs?: number; windowMs?: number }) {
    this.threshold = opts?.threshold ?? 5;
    this.resetTimeoutMs = opts?.resetTimeoutMs ?? 30_000;
    this.windowMs = opts?.windowMs ?? 60_000;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('[CircuitBreaker] Transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN — LLM provider temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.info('[CircuitBreaker] Transitioning to CLOSED');
    }
    this.state = 'CLOSED';
    this.failures = 0;
  }

  private onFailure() {
    const now = Date.now();
    // Reset count if the window has passed
    if (now - this.lastFailureTime > this.windowMs) {
      this.failures = 0;
    }
    this.failures++;
    this.lastFailureTime = now;

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker] OPEN after ${this.failures} failures in ${this.windowMs}ms window`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
