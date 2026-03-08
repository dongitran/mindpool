const STOP_KEYWORDS = ['okay', 'cảm ơn', 'đủ rồi', 'kết thúc'];

export class StopSignalDetector {
  private signals = {
    queueEmpty: false,
    userTrigger: false,
  };

  checkQueueEmpty(queueSize: number): void {
    this.signals.queueEmpty = queueSize === 0;
  }

  checkUserTrigger(message: string): void {
    const lower = message.toLowerCase().trim();
    this.signals.userTrigger = STOP_KEYWORDS.some((kw) => lower.includes(kw));
  }

  shouldStop(): boolean {
    return this.signals.queueEmpty && this.signals.userTrigger;
  }

  reset(): void {
    this.signals = { queueEmpty: false, userTrigger: false };
  }

  getSignals(): { queueEmpty: boolean; userTrigger: boolean } {
    return { ...this.signals };
  }
}
