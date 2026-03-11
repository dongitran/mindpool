import { describe, it, expect, vi, afterEach } from 'vitest';
import { MinimaxProvider } from '../../../llm/providers/minimax';

// Mock withRetry to pass through directly (test provider logic, not retry)
vi.mock('../../../llm/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MinimaxProvider', () => {
  const provider = new MinimaxProvider('test-minimax-key');

  it('has id "minimax"', () => {
    expect(provider.id).toBe('minimax');
  });

  it('returns string content for non-streaming call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from MiniMax' } }],
      }),
    });

    const result = await provider.chat(
      [{ role: 'user', content: 'Hello' }],
      'minimax-m2.5',
      { stream: false }
    );

    expect(result).toBe('Hello from MiniMax');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.minimax.chat/v1/text/chatcompletion_v2',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-minimax-key',
        }),
      })
    );
  });

  it('sends correct request body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });

    await provider.chat(
      [{ role: 'user', content: 'test' }],
      'minimax-m2.5',
      { maxTokens: 512, temperature: 0.3 }
    );

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.model).toBe('minimax-m2.5');
    expect(body.max_tokens).toBe(512);
    expect(body.temperature).toBe(0.3);
    expect(body.stream).toBe(false);
  });

  it('uses correct default options when none provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });

    await provider.chat([{ role: 'user', content: 'test' }], 'minimax-m2.5');

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(4096);
    expect(body.temperature).toBe(0.7);
    expect(body.stream).toBe(false);
  });

  it('returns empty string when choices array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await provider.chat([], 'minimax-m2.5');
    expect(result).toBe('');
  });

  it('returns empty string when choices is undefined', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await provider.chat([], 'minimax-m2.5');
    expect(result).toBe('');
  });

  it('throws on non-ok API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      provider.chat([{ role: 'user', content: 'test' }], 'minimax-m2.5')
    ).rejects.toThrow('[MiniMax] API error 401: Unauthorized');
  });

  it('returns ReadableStream when stream option is true', async () => {
    const mockStream = new ReadableStream();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const result = await provider.chat(
      [{ role: 'user', content: 'stream test' }],
      'minimax-m2.5',
      { stream: true }
    );

    expect(result).toBe(mockStream);
  });

  it('throws when stream response has no body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    });

    await expect(
      provider.chat([], 'minimax-m2.5', { stream: true })
    ).rejects.toThrow('[MiniMax] No response body for stream');
  });

  it('maps messages correctly in request body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    await provider.chat(
      [
        { role: 'system', content: 'You are a helper' },
        { role: 'user', content: 'Help me' },
      ],
      'minimax-m2.5'
    );

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are a helper' },
      { role: 'user', content: 'Help me' },
    ]);
  });
});
