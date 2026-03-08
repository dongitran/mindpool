# 🧠 Mindpool

> Every perspective. One room.

Mindpool là nền tảng AI multi-agent discussion — tạo phòng họp với các chuyên gia AI, mỗi agent một góc nhìn, cùng phân tích và tranh luận về bất kỳ chủ đề nào.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development (frontend + backend)
pnpm dev

# Seed database
pnpm -C scripts tsx seed-db.ts

# Run tests
pnpm test

# Typecheck
pnpm typecheck
```

## Architecture

```
mindpool/
├── apps/web/          # React frontend (Vite + Zustand + TailwindCSS)
├── apps/server/       # Express backend (Mongoose + ioredis)
├── packages/shared/   # Shared TypeScript types
├── e2e/               # Playwright E2E tests
├── infra/             # Pulumi infrastructure (stubs)
└── scripts/           # Seed & reset scripts
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Zustand, TailwindCSS, Framer Motion |
| Backend | Express, TypeScript, Mongoose, ioredis |
| LLM | Kimi (Moonshot AI) — primary, MiniMax — secondary |
| Database | MongoDB + Redis |
| Infra | Docker, Pulumi, GitHub Actions |

## Key Features (Phase 1 MVP)

- **Setup Chat** — MindX gợi ý agents phù hợp cho chủ đề
- **Meeting Room** — Agents thảo luận real-time qua SSE streaming
- **Raise Hand Queue** — FIFO queue, agents tự đăng ký phát biểu
- **Visible Thinking** — Xem quá trình suy nghĩ của từng agent
- **10 Built-in Agents** — Business, Engineering, UX, Security, Data, Legal, Creative, Ethics, Market, Devil's Advocate
- **History** — Grid cards grouped by time
- **Settings** — Model selection, thinking budget, appearance

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
MONGODB_URI=mongodb://localhost:27017/mindpool
REDIS_URL=redis://localhost:6379
KIMI_API_KEY=your-kimi-api-key
MINIMAX_API_KEY=your-minimax-api-key
PORT=3001
```

## Phases

- **Phase 1 (MVP)** — Current: end-to-end pool creation & discussion
- **Phase 2** — Mindmap view, auto recap, advanced MindX, export
- **Phase 3** — Custom agents, timeline view, marketplace, mobile
