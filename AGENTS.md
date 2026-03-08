# Mindpool — Agent Guidelines

## Project Overview
Mindpool là nền tảng AI multi-agent discussion — users tạo "pools" (phòng họp) với các chuyên gia AI, mỗi agent một góc nhìn, cùng phân tích và tranh luận về bất kỳ chủ đề nào qua raise-hand queue system.

## Architecture
```
mindpool/
├── apps/
│   ├── web/          # React 19 + Vite + Zustand + TailwindCSS + Framer Motion
│   └── server/       # Express + TypeScript + Mongoose + ioredis
├── packages/
│   └── shared/       # @mindpool/shared — TypeScript types dùng chung
├── e2e/              # Playwright E2E tests
├── scripts/          # seed-db.ts, reset-dev.ts
├── infra/            # Pulumi stubs (Phase 1)
├── docker-compose.yml
└── .env              # API keys + port config
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Zustand 5, TailwindCSS 3, Framer Motion |
| Backend | Express 4, TypeScript (CommonJS), Mongoose 8, ioredis 5 |
| LLM | Kimi/Moonshot (primary) · MiniMax (secondary) |
| Database | MongoDB 7 · Redis 7 |
| Infra | Docker Compose · Turborepo · pnpm workspaces |
| Testing | Playwright (E2E) · Vitest (unit) |

## Key Concepts
- **Pool** — phòng thảo luận với một topic + danh sách agents
- **MindX** — orchestrator agent: phân tích topic, chọn agent mở màn, wrap-up
- **Raise Hand Queue** — FIFO queue (max 4), agents tự đăng ký phát biểu
- **Visible Thinking** — collapsible thinking block (thinkSec hiển thị thời gian)
- **SSE Streaming** — real-time events qua Server-Sent Events
- **LLMRouter** — provider abstraction: `agentChat(callType, messages, opts)`
- **StopSignalDetector** — 2 signals: queue empty + user keywords

## Coding Conventions

### TypeScript
- Strict mode, CommonJS cho server (`"module": "CommonJS"`, `"moduleResolution": "Node"`)
- Server tsconfig **không** dùng path alias `@mindpool/shared` — resolve qua `node_modules`
- Shared types compile sang `dist/` trước khi server build
- `noUnusedLocals: false`, `noUnusedParameters: false` (relaxed cho development)

### Project Patterns
- **Routes → Services → Models** (Express)
- **Zustand stores**: `appStore` (navigation), `meetingStore` (pool state), `settingsStore`
- **CSS custom properties**: `--bg`, `--surface-1/2/3`, `--accent`, `--purple`, `--amber`
- **Fonts**: Sora (body) · DM Serif Display (headings) · JetBrains Mono (code/thinking)

### Shared Package
- `packages/shared/package.json` → `"main": "./dist/index.js"`, `"files": ["dist", "src"]`
- Phải build shared TRƯỚC server: `pnpm --filter @mindpool/shared build`
- Web app dùng vite alias `@mindpool/shared → packages/shared/src` (resolve TS source trực tiếp)

## Docker & Local Dev

### Chạy với Docker Compose
```bash
# Copy và điền API keys
cp .env.example .env   # hoặc chỉnh .env trực tiếp

# Build và start tất cả services
docker compose up --build -d

# Seed database (sau khi server healthy)
MONGO_URI=mongodb://localhost:27017/mindpool pnpm -C scripts tsx seed-db.ts
```

**Services:**
| Service | URL | Mô tả |
|---|---|---|
| `web` | http://localhost:3000 | React app (nginx) |
| `server` | http://localhost:3001 | Express API |
| `mongodb` | localhost:27017 | MongoDB |
| `redis` | localhost:6379 | Redis |

**Lưu ý Dockerfile:**
- Web Dockerfile dùng `--shamefully-hoist` + gọi vite từ `/app/node_modules/.bin/vite` (bypass pnpm stub issue)
- Server Dockerfile dùng `pnpm deploy --filter @mindpool/server --prod /deploy` cho production node_modules

### Chạy Local (dev mode)
```bash
pnpm install
pnpm dev          # turbo dev (frontend :5173 + backend :3001)
pnpm typecheck    # turbo typecheck
pnpm test         # turbo test (vitest)
```

## E2E Tests

```bash
# Chạy với docker compose đang chạy
BASE_URL=http://localhost:3000 pnpm --filter @mindpool/e2e exec playwright test

# Chạy với dev server (tự start)
pnpm --filter @mindpool/e2e exec playwright test

# Xem report
pnpm --filter @mindpool/e2e exec playwright show-report
```

**Playwright config** tự động detect mode qua `BASE_URL` env:
- `BASE_URL` set → dùng external server (docker compose), không start dev server
- Không set → tự start `pnpm dev` trước khi test

## Environment Variables

| Variable | Required | Mô tả |
|---|---|---|
| `KIMI_API_KEY` | Yes (production) | Moonshot AI API key |
| `MINIMAX_API_KEY` | No | MiniMax API key (fallback) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `PORT` | No (default 3001) | Server port |

> **Docker Compose** tự inject `MONGO_URI` và `REDIS_URL` qua `environment` block, override `.env`

## API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/conversations` | Tạo conversation mới |
| `POST` | `/api/conversations/:id/message` | Gửi tin nhắn, nhận MindX reply |
| `POST` | `/api/pool/create` | Tạo pool từ topic + agentIds |
| `GET` | `/api/pool/:id` | Lấy pool details |
| `GET` | `/api/pools` | Danh sách tất cả pools |
| `POST` | `/api/pool/:id/message` | User gửi tin trong meeting |
| `GET` | `/api/stream/:poolId` | SSE stream (real-time events) |
| `GET` | `/api/settings` | Lấy settings |
| `PUT` | `/api/settings` | Cập nhật settings |

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
