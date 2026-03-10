# Mindpool — Agent Guidelines

## Project Overview
Mindpool is an AI multi-agent discussion platform. Users create "pools" (meeting rooms) with AI expert agents, each with a distinct perspective, collaboratively analyzing and debating any topic via a raise-hand queue system.

## Architecture
```
mindpool/
├── apps/
│   ├── web/          # React 19 + Vite + Zustand + TailwindCSS + Framer Motion
│   └── server/       # Express + TypeScript + Mongoose + ioredis
├── packages/
│   └── shared/       # @mindpool/shared — shared TypeScript types
├── .agents/          # Agent configs & rules (Antigravity standard)
├── e2e/              # Playwright E2E tests
├── scripts/          # seed-db.ts, reset-dev.ts
├── infra/            # Pulumi (GKE deployment)
├── docker-compose.yml
└── .env              # API keys + port config
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Zustand 5, TailwindCSS 3, Framer Motion |
| Backend | Express 4, TypeScript, Mongoose 8, ioredis 5 |
| LLM | Kimi/Moonshot (primary) · MiniMax (secondary) |
| Database | MongoDB 7 · Redis 7 |
| Infra | Docker Compose · Turborepo · pnpm workspaces |
| Testing | Playwright (E2E) · Vitest (unit) |

## Key Concepts
- **Pool** — discussion room with a topic + list of agents
- **MindX** — orchestrator agent: analyzes topic, selects opening agent, generates wrap-up
- **Raise Hand Queue** — FIFO queue (max depth 4), agents self-register to speak
- **Visible Thinking** — collapsible thinking block (thinkSec shows elapsed time)
- **SSE Streaming** — real-time events via Server-Sent Events
- **LLMRouter** — provider abstraction: `agentChat(callType, messages, opts)`
- **StopSignalDetector** — 2 stop signals: queue empty + user keywords

## Coding Conventions

### TypeScript
- Strict mode enabled
- Server resolves `@mindpool/shared` via `node_modules` (not path alias)
- Shared types must be compiled to `dist/` before the server builds
- Web app uses Vite alias `@mindpool/shared → packages/shared/src` (resolves TS source directly)

### Project Patterns
- **Routes → Services → Models** (Express layered architecture)
- **Zustand stores**: `appStore` (navigation), `meetingStore` (pool state), `settingsStore`
- **CSS custom properties**: `--bg`, `--surface-1/2/3`, `--accent`, `--purple`, `--amber`
- **Fonts**: Sora (body) · DM Serif Display (headings) · JetBrains Mono (code/thinking)

### Shared Package
- `packages/shared/package.json` → `"main": "./dist/index.js"`, `"files": ["dist", "src"]`
- Build shared **before** server: `pnpm --filter @mindpool/shared build`

## Docker & Local Dev

### Run with Docker Compose
```bash
# Copy and fill in API keys
cp .env.example .env

# Build and start all services
docker compose up --build -d

# Seed database (after server is healthy)
MONGO_URI=mongodb://localhost:27017/mindpool pnpm -C scripts tsx seed-db.ts
```

**Services:**
| Service | URL | Description |
|---|---|---|
| `web` | http://localhost:3000 | React app (nginx) |
| `server` | http://localhost:3001 | Express API |
| `mongodb` | localhost:27017 | MongoDB |
| `redis` | localhost:6379 | Redis |

**Dockerfile notes:**
- Web Dockerfile uses `--shamefully-hoist` and invokes vite from `/app/node_modules/.bin/vite` (bypasses pnpm stub issue)
- Server Dockerfile uses `pnpm deploy --filter @mindpool/server --prod /deploy` for production node_modules

### Run locally (dev mode)
```bash
pnpm install
pnpm dev          # turbo dev (frontend :5173 + backend :3001)
pnpm typecheck    # turbo typecheck
pnpm test         # turbo test (vitest)
```

## E2E Tests

```bash
# Run against docker compose
BASE_URL=http://localhost:3000 pnpm --filter @mindpool/e2e exec playwright test

# Run with auto-started dev server
pnpm --filter @mindpool/e2e exec playwright test

# View report
pnpm --filter @mindpool/e2e exec playwright show-report
```

**Playwright config** auto-detects mode via `BASE_URL` env:
- `BASE_URL` set → uses external server (docker compose), skips dev server startup
- Not set → auto-starts `pnpm dev` before running tests

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `KIMI_API_KEY` | Yes | Moonshot AI API key |
| `MINIMAX_API_KEY` | No | MiniMax API key (fallback) |
| `MINDPOOL_HOST` | No | Production hostname (used for CORS) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `PORT` | No (default 3001) | Server port |

> **Docker Compose** injects `MONGO_URI` and `REDIS_URL` via the `environment` block, overriding `.env`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (returns 503 if DB disconnected) |
| `POST` | `/api/conversations` | Create a new conversation |
| `POST` | `/api/conversations/:id/message` | Send message, receive MindX reply |
| `POST` | `/api/pool/create` | Create pool from topic + agentIds |
| `GET` | `/api/pool/:id` | Get pool details |
| `GET` | `/api/pools` | List all pools |
| `POST` | `/api/pool/:id/message` | User sends message in meeting |
| `GET` | `/api/stream/:poolId` | SSE stream (real-time events) — supports `?after=<ISO>` |
| `GET` | `/api/settings` | Get settings |
| `PUT` | `/api/settings` | Update settings |

## SSE Event Types
```typescript
type SSEEvent =
  | { type: 'connected'; poolId: string }
  | { type: 'message'; message: Message }
  | { type: 'agent_state'; agentId: string; state: AgentState }
  | { type: 'queue_update'; queue: string[] }
  | { type: 'thinking_start'; agentId: string }
  | { type: 'thinking_end'; agentId: string; thinkSec: number }
  | { type: 'pool_status'; status: PoolStatus }
  | { type: 'error'; message: string }
  | { type: 'heartbeat' }
```

## Phases
- **Phase 1 (MVP)** ✅ — end-to-end pool creation & discussion (current)
- **Phase 2** — Mindmap view, auto recap, advanced MindX, export
- **Phase 3** — Custom agents, timeline view, marketplace, mobile
