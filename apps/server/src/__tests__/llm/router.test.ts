import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMRouter } from '../../llm/router';
import type { LLMProvider } from '../../llm/types';
import type { RouterConfig } from '@mindpool/shared';

const makeProvider = (id: string): LLMProvider & { chat: ReturnType<typeof vi.fn> } => ({
  id,
  chat: vi.fn(),
});

const config: RouterConfig = {
  full_response: { provider: 'kimi', model: 'kimi-k2' },
  relevance_check: { provider: 'minimax', model: 'minimax-m2.5' },
  recap_synthesis: { provider: 'kimi', model: 'kimi-k2' },
};

describe('LLMRouter', () => {
  let router: LLMRouter;
  let kimi: ReturnType<typeof makeProvider>;
  let minimax: ReturnType<typeof makeProvider>;

  beforeEach(() => {
    kimi = makeProvider('kimi');
    minimax = makeProvider('minimax');
    router = new LLMRouter(config);
    router.registerProvider(kimi);
    router.registerProvider(minimax);
  });

  it('routes full_response to kimi with correct model', async () => {
    kimi.chat.mockResolvedValue('kimi response');
    const messages = [{ role: 'user' as const, content: 'hello' }];
    const result = await router.agentChat('full_response', messages);
    expect(result).toBe('kimi response');
    expect(kimi.chat).toHaveBeenCalledWith(messages, 'kimi-k2', undefined);
    expect(minimax.chat).not.toHaveBeenCalled();
  });

  it('routes relevance_check to minimax with correct model', async () => {
    minimax.chat.mockResolvedValue('yes');
    const messages = [{ role: 'user' as const, content: 'is this relevant?' }];
    const result = await router.agentChat('relevance_check', messages);
    expect(result).toBe('yes');
    expect(minimax.chat).toHaveBeenCalledWith(messages, 'minimax-m2.5', undefined);
    expect(kimi.chat).not.toHaveBeenCalled();
  });

  it('routes recap_synthesis to kimi', async () => {
    kimi.chat.mockResolvedValue('recap text');
    await router.agentChat('recap_synthesis', []);
    expect(kimi.chat).toHaveBeenCalledWith([], 'kimi-k2', undefined);
  });

  it('passes options through to provider', async () => {
    kimi.chat.mockResolvedValue('streamed');
    const options = { stream: true, maxTokens: 1000 };
    await router.agentChat('full_response', [], options);
    expect(kimi.chat).toHaveBeenCalledWith([], 'kimi-k2', options);
  });

  it('throws when provider is not registered', async () => {
    const emptyRouter = new LLMRouter(config);
    await expect(emptyRouter.agentChat('full_response', [])).rejects.toThrow(
      '[LLMRouter] Provider not registered: kimi'
    );
  });

  it('getConfig returns a copy of current config', () => {
    const c = router.getConfig();
    expect(c.full_response.model).toBe('kimi-k2');
    expect(c.relevance_check.model).toBe('minimax-m2.5');
    // ensure it's a copy, not a reference
    c.full_response.model = 'modified';
    expect(router.getConfig().full_response.model).toBe('kimi-k2');
  });

  it('updateConfig merges partial config', () => {
    router.updateConfig({ full_response: { provider: 'minimax', model: 'minimax-m2.5' } });
    expect(router.getConfig().full_response.model).toBe('minimax-m2.5');
    expect(router.getConfig().relevance_check.model).toBe('minimax-m2.5');
  });
});
