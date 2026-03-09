# Mindpool Server — Agent Guidelines

## Stack
Express + TypeScript + Mongoose + ioredis

## Architecture
- Routes → Services → Models (layered architecture)
- LLMRouter → Providers (strategy pattern for LLM calls)
- QueueManager for raise-hand queue (FIFO, max depth 4)
- SSE streaming for real-time client updates

## Key Services
- `mindx.service.ts` — MindX orchestrator: agent selection, relevance checks, wrap-up
- `pool.service.ts` — Pool CRUD operations
- `recap.service.ts` — Recap generation (Phase 2)

## LLM Providers
- Kimi (Moonshot AI) — Primary, full agent responses
- MiniMax — Secondary, cheap relevance checks

## Models
- Pool, Agent, Message, Conversation, Settings (Mongoose)

## SSE Events
See `packages/shared/types/events.ts` for event type definitions.

## Logging
- Use `logger` from `src/lib/logger.ts` (winston) — **không dùng console.log/error**
- Dev: colored stdout. Prod: JSON stdout (parse với log aggregator)
- Luôn pass metadata object: `logger.error('msg', { poolId, error })`

## Security Patterns
- CORS: chỉ cho phép `localhost:3000`, `localhost:5173`, và `https://${MINDPOOL_HOST}`
- Health check `/health`: trả 503 nếu MongoDB disconnected (`readyState !== 1`)
- Request body limit: `1mb` (express.json)

## Performance Patterns
- **Không dùng N+1 query**: khi cần nhiều Agent docs, dùng `Agent.find({ _id: { $in: ids } })` rồi build Map
- DB indexes: `Message(poolId+timestamp)`, `Pool(updatedAt)`, `Pool(status)` — đã có sẵn
- `withTimeout<T>()` helper trong `mindx.service.ts` cho tất cả LLM calls (15s relevance, 120s response, 60s wrapUp)
