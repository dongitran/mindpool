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
- Use `logger` from `src/lib/logger.ts` (winston) — **never use console.log/error**
- Dev: colored stdout. Prod: JSON stdout (structured for log aggregators)
- Always pass a metadata object: `logger.error('msg', { poolId, error })`

## Security Patterns
- CORS: only allow `localhost:3000`, `localhost:5173`, and `https://${MINDPOOL_HOST}`
- Health check `/health`: returns 503 if MongoDB is disconnected (`readyState !== 1`)
- Request body limit: `1mb` (express.json)

## Performance Patterns
- **No N+1 queries**: when multiple Agent docs are needed, use `Agent.find({ _id: { $in: ids } })` and build a Map
- DB indexes already in place: `Message(poolId+timestamp)`, `Pool(updatedAt)`, `Pool(status)`
- `withTimeout<T>()` helper in `mindx.service.ts` wraps all LLM calls (15s relevance, 120s response, 60s wrapUp)
