import { describe, it, expect, vi, afterEach } from 'vitest';
import { KimiProvider } from '../../../llm/providers/kimi';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('KimiProvider', () => {
  const provider = new KimiProvider('test-api-key');

  it('has id "kimi"', () => {
    expect(provider.id).toBe('kimi');
  });

  it('returns string content for non-streaming call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from Kimi' } }],
      }),
    });

    const result = await provider.chat(
      [{ role: 'user', content: 'Hello' }],
      'kimi-k2',
      { stream: false }
    );

    expect(result).toBe('Hello from Kimi');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.kimi.com/coding/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    );
  });

  it('uses correct default options when none provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });

    await provider.chat([{ role: 'user', content: 'test' }], 'kimi-k2');

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(4096);
    expect(body.temperature).toBe(0.7);
    expect(body.stream).toBe(false);
    expect(body.model).toBe('kimi-k2');
  });

  it('returns empty string when choices array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await provider.chat([], 'kimi-k2');
    expect(result).toBe('');
  });

  it('throws on non-ok API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      provider.chat([{ role: 'user', content: 'test' }], 'kimi-k2')
    ).rejects.toThrow('[Kimi] API error 401: Unauthorized');
  });

  it('returns ReadableStream when stream option is true', async () => {
    const mockStream = new ReadableStream();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const result = await provider.chat(
      [{ role: 'user', content: 'stream test' }],
      'kimi-k2',
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
      provider.chat([], 'kimi-k2', { stream: true })
    ).rejects.toThrow('[Kimi] No response body for stream');
  });
});
