export class QueueManager {
  private queue: string[] = [];
  private maxDepth = 4;

  addToQueue(agentId: string): boolean {
    if (this.isFull() || this.isInQueue(agentId)) {
      return false;
    }
    this.queue.push(agentId);
    return true;
  }

  popFromQueue(): string | null {
    return this.queue.shift() ?? null;
  }

  getQueue(): { agentId: string; position: number }[] {
    return this.queue.map((agentId, index) => ({
      agentId,
      position: index + 1,
    }));
  }

  isInQueue(agentId: string): boolean {
    return this.queue.includes(agentId);
  }

  isFull(): boolean {
    return this.queue.length >= this.maxDepth;
  }

  clear(): void {
    this.queue = [];
  }

  getSize(): number {
    return this.queue.length;
  }
}
