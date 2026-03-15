import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env vars before any app code paths run
process.env.MONGO_URI = 'mongodb://localhost/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_bytes_long_123';

import request from 'supertest';
import express from 'express';
import { poolRouter } from '../../routes/pool';

// We need a minimal app for supertest
const app = express();
app.use(express.json());
app.use('/', poolRouter);

// Add error handler just to log for testing
app.use((err: unknown, _req: unknown, res: express.Response, _next: unknown) => {
    console.error('Test Route Error:', err);
    res.status(500).json({ error: (err as Error).message });
});

vi.mock('../../lib/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../lib/meetingLogger', () => ({
    logMeetingInfo: vi.fn(),
    logMeetingError: vi.fn(),
}));

// Mock the mindxService used by the routes
vi.mock('../../services/mindx.service', () => {
    return {
        getQueueManager: vi.fn(() => ({
            addToQueue: vi.fn().mockResolvedValue(true),
        })),
        getStopDetector: vi.fn(() => ({
            checkUserTrigger: vi.fn(),
        })),
        selectOpeningAgent: vi.fn().mockResolvedValue({ agentId: 'agent-1' }),
        generateAnnouncement: vi.fn().mockResolvedValue(null),
    };
});

// Mock the DI module that the route actually imports
vi.mock('../../di', () => {
    return {
        poolService: {
            getPool: vi.fn().mockResolvedValue({ _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', title: 'Test Pool', status: 'active', agents: [{ _id: 'agent-1' }] }),
            createUserMessage: vi.fn().mockResolvedValue({ _id: 'cccccccccccccccccccccccc', content: 'hello', timestamp: new Date() }),
            addMessage: vi.fn().mockResolvedValue({ _id: 'cccccccccccccccccccccccc', content: 'hello', timestamp: new Date() }),
        },
    };
});

// Mock redis for the route
vi.mock('../../lib/redis', () => {
    return {
        redis: {
            rpush: vi.fn().mockResolvedValue(1)
        },
        MEETING_QUEUE_KEY: 'test:meeting:queue',
    };
});

describe('Integration: POST /pool/:id/message', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('QC Test: should handle empty content gracefully (validation boundary)', async () => {
        const response = await request(app)
            .post('/pool/bbbbbbbbbbbbbbbbbbbbbbbb/message')
            .send({ content: '' });

        // Ensure the backend catches the validation error before creating a message
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('QC Test: should correctly process valid message and add user to meeting queue', async () => {
        const response = await request(app)
            .post('/pool/bbbbbbbbbbbbbbbbbbbbbbbb/message')
            .send({ content: 'Hello agents' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('_id', 'cccccccccccccccccccccccc');

        // Assert redis push happened for the queue worker with exact key and payload pattern
        const { redis, MEETING_QUEUE_KEY } = await import('../../lib/redis');
        expect(redis.rpush).toHaveBeenCalledWith(
            MEETING_QUEUE_KEY,
            expect.stringContaining('"poolId":"bbbbbbbbbbbbbbbbbbbbbbbb"')
        );
    });
});
