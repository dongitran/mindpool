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
