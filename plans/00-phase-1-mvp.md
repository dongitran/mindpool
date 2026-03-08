# 🚀 Phase 1 — MVP

> **Source:** [idea.md](../docs/idea.md) · [prototype.html](../docs/prototype.html)
> **Mục tiêu:** Có một sản phẩm chạy được end-to-end — user tạo pool, agents thảo luận real-time, user đọc được.

---

## � Folder Structure

```
mindpool/
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── turbo.json
├── tsconfig.base.json
├── package.json
│
├── .github/workflows/
│   ├── ci.yml                       # Lint + test on PR
│   └── deploy.yml                   # Push to main → deploy
│
├── scripts/
│   ├── seed-db.ts                   # Seed mock agents + pools
│   └── reset-dev.ts                 # Reset local state
│
├── e2e/                             # 🎭 Playwright E2E
│   ├── playwright.config.ts
│   ├── fixtures/
│   └── tests/
│       ├── setup-pool.spec.ts
│       ├── meeting-room.spec.ts
│       └── history.spec.ts
│
├── apps/
│   ├── web/                         # ⚛️ React (Vite)
│   │   ├── AGENTS.md
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── components/
│   │       │   ├── chat/            # ChatInput, MessageBubble, AgentSuggestion
│   │       │   ├── meeting/         # AgentsPanel, DiscussionFeed, ThinkingBlock, RaiseHandBadge
│   │       │   └── ui/              # Button, Tag, Toggle...
│   │       ├── constants/agents.ts  # Agent library, colors, icons
│   │       ├── stores/              # meetingStore, agentStore, settingsStore
│   │       ├── hooks/               # useSSE, useMeeting
│   │       ├── screens/             # WelcomeScreen, SetupScreen, MeetingScreen, HistoryScreen
│   │       ├── lib/api.ts
│   │       └── __tests__/
│   │
│   └── server/                      # 🚀 Express backend
│       ├── AGENTS.md
│       ├── Dockerfile
│       └── src/
│           ├── config/index.ts
│           ├── routes/              # pool, stream (SSE), settings
│           ├── services/            # pool, mindx, recap
│           ├── llm/                 # ⭐ router.ts, types.ts, providers/
│           ├── queue/               # QueueManager, StopSignalDetector
│           ├── models/              # Pool, Agent, Message, Conversation
│           ├── middleware/
│           └── __tests__/
│
├── infra/                           # Pulumi (TS) — stack refs
│   └── src/stacks/                  # network, database, web, server
│
└── packages/shared/types/           # pool, agent, events (SSE)
```

---

## �📋 Scope

### ✅ Bao gồm
- [ ] Setup monorepo (Turborepo + shared types)
- [ ] Welcome Screen (landing page với feature cards + gợi ý chủ đề)
- [ ] Setup chat interface với MindX (tạo conversation, chat multi-turn)
- [ ] MindX gợi ý agents (NLP) + user toggle agents inline + update block tại chỗ
- [ ] "Bắt đầu Meeting" → tạo pool → button biến thành Meeting Card inline
- [ ] Sidebar: Meetings list (live/done dot) + Conversations list (meeting chips nhảy vào meeting)
- [ ] Pool room với linear feed — 2 cột: agents panel + discussion feed
- [ ] Agent panel: 4 states — 🧠 Moderating, 🎤 Speaking (wave anim), ✋ Queued (#badge), ○ Listening
- [ ] Raise hand queue cơ bản (FIFO + incremental relevance check)
- [ ] Visible thinking — collapse/expand Claude-style ("Thought for N seconds")
- [ ] 10 built-in agents + MindX orchestrator (không cho user tùy chỉnh)
- [ ] Pool history — grid cards grouped by time (Live / This Week / Last Month)
- [ ] SSE streaming — real-time agent responses (thinking + message + queue_update)
- [ ] LLMRouter + KimiProvider + MinimaxProvider
- [ ] MongoDB: Pool, Agent, Message, Conversation schemas
- [ ] Redis: queue state cache
- [ ] Dockerfiles + deploy Pulumi
- [ ] AGENTS.md root + sub-apps
- [ ] CI/CD: ci.yml + deploy.yml
- [ ] E2E Playwright tests cơ bản

### ❌ Không bao gồm
- Mindmap view / Split view (có tab UI nhưng disabled, placeholder "Coming in Phase 2")
- Pool recap auto-generate (MindX chỉ gửi wrap-up thủ công, không lưu recap object)
- Custom agents
- Export (PDF, Notion)
- Mobile responsive
- User interrupt / Debate loop detection / Context drift / Meeting Temperature (MindX Phase 2)
- Full 5 stop signals (chỉ 2/5: queue empty + user trigger)
- Jira / Notion integration (Settings UI hiện nhưng disabled)
- User authentication (single-user mode)

---

## 🏗️ Technical Tasks

### 1. Infra & Setup
- [ ] Init Turborepo monorepo (`turbo.json`, `tsconfig.base.json`, root `package.json`)
- [ ] Setup `packages/shared` — SSE event types, Pool/Agent/Message types
- [ ] Setup `apps/web` — Vite + React + TypeScript + Zustand + TailwindCSS + Framer Motion
- [ ] Setup `apps/server` — Express + TypeScript + Mongoose + ioredis
- [ ] Setup `infra/` — Pulumi stack (network → database → server → web)
- [ ] `AGENTS.md` root + `apps/web/AGENTS.md` + `apps/server/AGENTS.md`
- [ ] `.github/workflows/ci.yml` — lint + typecheck + unit tests on PR
- [ ] `.github/workflows/deploy.yml` — push main → pulumi up
- [ ] `scripts/seed-db.ts` — seed 10 built-in agents + 2-3 demo pools
- [ ] Docker: `apps/web/Dockerfile` + `apps/server/Dockerfile`

### 2. LLM Layer
- [ ] `packages/shared/types/llm.ts` — `LLMProvider` interface, `RouterConfig`, `CallType`
- [ ] `apps/server/src/llm/types.ts` — import + extend shared types
- [ ] `apps/server/src/llm/providers/kimi.ts` — wrap Kimi API (OpenAI-compatible format)
- [ ] `apps/server/src/llm/providers/minimax.ts` — wrap MiniMax REST API
- [ ] `apps/server/src/llm/providers/index.ts` — provider registry
- [ ] `apps/server/src/llm/router.ts` — `LLMRouter` class, resolve `callType` → config → provider
- [ ] Default config: `full_response → kimi-k2`, `relevance_check → minimax-m2.5`
- [ ] **Lưu ý:** Settings UI model selector hiển thị Kimi models (kimi-k2, kimi-k2.5, kimi-k2-thinking) + MiniMax models — **không dùng Claude models** như trong prototype (prototype dùng placeholder Anthropic models)
- [ ] Unit tests: `router.test.ts`, `kimi.test.ts` (mock API)

### 3. Database Models
- [ ] `Conversation` schema:
  ```
  { title, sub, messages: [
    { type: 'bot' | 'user' | 'bot-agents' | 'bot-created', time, content,
      // bot-agents specific:
      intro, agents: [{ icon, name, desc, checked }], btnId, meetingId,
      // bot-created specific:
      meetingTitle, agentBadges: [string] }
  ]}
  ```
- [ ] `Pool` schema:
  ```
  { title, topic, status: 'setup' | 'active' | 'completed',
    agents: [AgentRef], messages: [MessageId], queue: [AgentId],
    conversationId, statusText, duration,
    mapCenter, mapCenterSub, mapNodes: [] (stub cho Phase 2),
    sendAgents: [{ icon, name, role }] (agents có thể respond khi user chat),
    createdAt, updatedAt }
  ```
- [ ] `Agent` schema:
  ```
  { name, icon, specialty, systemPrompt, personality: { directness, creativity, skepticism },
    signatureQuestion, isCustom: false }
  ```
- [ ] `Message` schema:
  ```
  { poolId, agentId | 'user' | 'mindx', thinking, thinkSec (number),
    content, replyTo (stub), timestamp }
  ```
- [ ] Seed data: 10 built-in agents + MindX (idea.md Section 9) + 2-3 demo pools + conversations

### 4. Backend — MindX Orchestrator
- [ ] `POST /api/conversations` — tạo conversation mới
- [ ] `POST /api/conversations/:id/message` — gửi user message → MindX reply (gợi ý agents)
  - **Setup phase logic**: MindX phân tích topic → gợi ý agents phù hợp nhất
  - Hỏi thêm context nếu cần: "Startup bạn đang ở giai đoạn nào?", "Ngân sách?"
  - Xử lý refine: "thêm Legal vào", "bỏ Security đi" → update agent suggestion block inline
  - Return `bot-agents` message type khi đủ context
- [ ] `POST /api/pool/create` — nhận topic + agentIds → tạo Pool → return poolId + meetingCard data
- [ ] `GET /api/stream/:poolId` — SSE connection
- [ ] `POST /api/pool/:id/message` — user gửi tin vào meeting (đơn giản, chưa có pause/resume)
- [ ] `GET /api/pool/:id` — get pool details (for re-rendering meeting from sidebar/history)
- [ ] `GET /api/conversations` — list conversations (sidebar)
- [ ] `GET /api/pools` — list pools (sidebar + history)
- [ ] `mindx.service.ts`:
  - **Agent Selection Logic** — chọn agent mở đầu phù hợp nhất dựa trên topic:
    ```
    1. MindX nhận topic + agent lineup từ pool
    2. So sánh topic keywords vs từng agent.specialty (keyword matching / cheap LLM call)
    3. Agent có overlap cao nhất → chọn phát biểu đầu tiên
    4. Nếu tie → ưu tiên: Business Strategist (broadest scope, đặt frame bài toán)
    5. Fallback: agent đầu tiên trong lineup
    ```
  - Announce mở đầu: "Mindpool đã sẵn sàng! Tôi sẽ bắt đầu với [Agent]..."
  - Sau mỗi agent phát biểu: trigger relevance check cho listening agents (parallel, cheap)
  - Cập nhật queue (FIFO, max depth 3-4)
  - Cấp quyền cho agent đầu queue → full generation
  - Kiểm tra stop signals (2/5: queue empty + user trigger "okay"/"đủ rồi"/"cảm ơn")
  - MindX wrap-up message: ✓ Đồng thuận / ⚠️ Cần lưu ý / ❓ Còn open / Action items
  - Set pool status → `completed`, disable input

### 5. Backend — Queue & Relevance
- [ ] `QueueManager.ts`:
  - `addToQueue(agentId)` — append (FIFO)
  - `popFromQueue()` — shift
  - `getQueue()` — return current queue với position numbers
  - `isInQueue(agentId)` — check duplicate (avoid agent raise hand twice)
  - `isFull()` — check max queue depth (3-4 agents)
  - State cached trong Redis
- [ ] `StopSignalDetector.ts`:
  - Signal 1: queue trống sau 1 turn → không agent nào raise hand
  - Signal 5: user trigger keywords ("okay", "cảm ơn", "đủ rồi", "kết thúc")
  - Return `shouldStop: boolean` khi cả 2 signals đều active
- [ ] Incremental relevance check:
  - Chỉ agents **Listening** mới check (xem idea.md Section 6 table)
  - Agent vừa nói → skip
  - Agent đang trong queue → skip
  - Queue đầy → skip tất cả (không thêm được)
  - Dùng `LLMRouter.agentChat(callType: 'relevance_check')` → MiniMax M2.5 (cheap, fast)

### 6. Frontend — Layout & Sidebar
- [ ] App shell: sidebar + main content area (giống `prototype.html`)
- [ ] Sidebar:
  - Logo + "New Pool" button
  - **Meetings** section: list meeting items (dot live/done + title + meta)
  - **Conversations** section: list conversations (title + "N meetings" + meeting chips)
  - Footer: "All Pools" (→ History) + "Settings" (→ Settings)
- [ ] Navigation: `showScreen(name)` — welcome / setup / meeting / history / settings
- [ ] Routing: React Router hoặc simple state-based (giống prototype)
- [ ] **Sidebar Navigation Flow** (UX behavior rõ ràng):
  | Action | Kết Quả |
  |---|---|
  | Click **meeting item** (sidebar Meetings section) | Mở MeetingScreen với meeting đó |
  | Click **conversation item** (sidebar Conversations section) | Mở SetupScreen với conversation đó |
  | Click **meeting chip** bên trong conversation | Mở MeetingScreen (không mở Setup) |
  | Click **"New Pool"** button | Mở SetupScreen với conversation mới (blank) |
  | Click **"All Pools"** footer | Mở HistoryScreen |
  | Click **"Settings"** footer | Mở SettingsScreen |
  | Click **logo** | Mở WelcomeScreen |

### 7. Frontend — Welcome Screen
- [ ] Logo + tagline "Welcome to Mindpool"
- [ ] Description text
- [ ] CTA button "Tạo Mindpool đầu tiên" → navigate Setup
- [ ] 4 feature cards: Raise Hand Queue / Mindmap View / Smart Setup / Auto Recap
- [ ] Gợi ý chủ đề pills (clickable → navigate Setup) — **MVP: hardcoded** ("Nên build mobile app không?", "Pricing strategy cho SaaS"...), Phase 2 sẽ dynamic từ user history
- [ ] Glow animation background

### 8. Frontend — Setup Chat
- [ ] `SetupScreen`: chat header (conv title + Online tag) + message list + input area
- [ ] Render message types:
  - `bot` — MindX greeting/reply (avatar gradient)
  - `user` — user messages (right-aligned, accent background)
  - `bot-agents` — agent suggestion block: checkbox rows + "Bắt đầu Meeting" button
  - `bot-created` — meeting card inline (✓ Created badge + agent badges + "Vào Meeting" button)
- [ ] `AgentSuggestion` component: toggle checkbox → update inline (không tạo new block)
- [ ] "Bắt đầu Meeting" button → POST /api/pool/create → button biến thành Meeting Card
- [ ] Meeting Card: title + agent emojis + "→ Vào Meeting Room" link
- [ ] Multi-meeting trong 1 conversation: mỗi lần "Bắt đầu" tạo meeting mới, cards independant
- [ ] `useSSE` hook chuẩn bị sẵn nhưng trigger khi vào MeetingScreen

### 9. Frontend — Meeting Room
- [ ] `MeetingScreen`:
  - Topbar: ← Back + meeting title + status (dot pulse for live / amber for done) + view tabs
  - View tabs: 💬 Chat (active) | 🗺 Mindmap (disabled, tooltip "Coming Phase 2")
  - Body: 2 cột — Agents Panel (210px) + Discussion Feed
  - Input area: hint `@agent` + textarea + send button
  - **Status handling**: if `completed` → input disabled, placeholder "✓ Meeting đã kết thúc — chỉ xem lịch sử"
- [ ] `AgentsPanel`:
  - Title: "Agents · N" (N = total)
  - 🧠 MindX — `moderating` state (✦ Moderating badge, green tint)
  - 🎤 Speaking — accent highlight + wave animation (5 bars) + 🎤 Speaking badge
  - ✋ Queued — purple highlight + queue order circle badge (#1, #2) + ✋ Queue #N badge
  - ○ Listening — subtle surface-2 background + ○ Listening badge
  - "+ Add Agent" button — **MVP: cho phép add thêm built-in agents chưa tham gia pool** (hiện modal chọn từ 10 agents). Không cho tạo custom agent mới (Phase 3).
- [ ] `DiscussionFeed`:
  - Agent message: header (icon + name + role + time) + optional thinking block + bubble
  - User message: right-aligned, accent background, max-width 460px
  - MindX message: special `.mindx` styling (accent-left border, green-tinted bg)
  - Typing indicator: 3 bouncing dots (show while agent generating)
  - Auto-scroll to bottom on new message
  - **Cả thinking lẫn message stream qua SSE** — thinking shows trước, rồi message content stream in
- [ ] `ThinkingBlock`:
  - Collapsed default: `▶ Thought for N seconds` (JetBrains Mono, pill shape)
  - Expanded: purple left border, monospace text, fade-in animation
  - Click toggle (collapsed by default, trừ khi Settings "Show thinking by default" on)
- [ ] `useSSE` hook:
  - Connect `EventSource` to `/api/stream/:poolId`
  - Parse events: `mindx_announce`, `agent_thinking`, `agent_message`, `agent_done`, `agent_typing`, `queue_update`, `agent_state`, `pool_complete`, `error`
  - Update Zustand stores accordingly
  - Reconnect logic nếu connection drop
- [ ] Input gửi tin: POST → server → random pick từ pool's `sendAgents` list respond (simple P1)
- [ ] Navigate vào meeting: từ sidebar meeting item / conversation meeting chip / history card → tất cả render cùng MeetingScreen

### 10. Frontend — History
- [ ] `HistoryScreen`: title "Your Mindpools" + stats
- [ ] Grid cards grouped by sections: Live / This Week / Last Month
- [ ] Pool card: title + agent emojis + summary snippet (left accent border) + status tag + meta
- [ ] Click card → navigate to MeetingScreen

### 11. Frontend — Settings (Basic)
- [ ] Profile section (avatar gradient, initials, name, email, Edit Profile button)
- [ ] AI Model section:
  - Default model selector (radio group) — hiển thị Kimi + MiniMax models:
    - `kimi-k2` — Cân bằng tốc độ & chất lượng · Recommended (Active tag)
    - `kimi-k2.5` — Multimodal, suy luận sâu nhất (Pro tag)
    - `minimax-m2.5` — Nhanh nhất, tiết kiệm token
  - Thinking Budget slider (3s — 30s, JetBrains Mono value display)
- [ ] Meeting Behaviour section:
  - Auto-start discussion toggle (ON default)
  - Show thinking by default toggle (OFF default)
  - MindX Orchestrator toggle (ON default, always on P1)
  - Auto Recap toggle (ON default, functional ở Phase 2)
  - Max agents per pool slider (2 — 10, default 6)
- [ ] Appearance section:
  - Compact sidebar toggle
  - Accent color swatches (5 colors: mint #3dffc0, purple #8b7cf8, amber #ffc46b, pink #ff6b9d, blue #6bb5ff)
  - `selectAccent()` — dynamic CSS variable update (`--accent`, `--accent-dim`, `--accent-glow`)
- [ ] API & Integrations section:
  - Kimi API Key input (password + Reveal + Save)
  - MiniMax API Key input
  - Jira Integration — "Connect" button (disabled P1)
  - Notion Export — "Connect" button (disabled P1)
- [ ] Danger Zone: Clear archived + Delete account (confirm dialog)

#### 11.1 Settings Schema MVP (`apps/server/src/models/Settings.ts`)
```typescript
interface SettingsMVP {
  userId: 'default';           // single-user mode, Phase 3 sẽ có real userId
  defaultModel: string;        // 'kimi-k2' | 'kimi-k2.5' | 'minimax-m2.5' (default: 'kimi-k2')
  thinkingBudget: number;      // seconds, 3-30, default: 10
  autoStartDiscussion: boolean; // default: true
  showThinkingDefault: boolean; // default: false
  mindxEnabled: boolean;       // default: true (always on P1)
  autoRecap: boolean;          // default: true (functional Phase 2)
  maxAgentsPerPool: number;    // 2-10, default: 6
  compactSidebar: boolean;     // default: false
  accentColor: string;         // default: '#3dffc0'
  apiKeys: {
    kimi?: string;             // encrypted at rest
    minimax?: string;          // encrypted at rest
  };
}
```
- [ ] `GET /api/settings` — return current settings
- [ ] `PUT /api/settings` — update settings
- [ ] Seed default settings khi first launch

---

## 📐 SSE Events (`packages/shared/types/events.ts`)

```typescript
// Server → Client event types
type SSEEvent =
  | { type: 'mindx_announce'; content: string }
  | { type: 'agent_typing';   agentId: string; agentName: string; icon: string; role: string }
  | { type: 'agent_thinking'; agentId: string; agentName: string; content: string; thinkSec: number }
  | { type: 'agent_message';  agentId: string; agentName: string; content: string }
  | { type: 'agent_done';     agentId: string }
  | { type: 'queue_update';   queue: { agentId: string; position: number }[] }
  | { type: 'agent_state';    agentId: string; state: 'speaking' | 'queued' | 'listening' | 'moderating' }
  | { type: 'pool_complete';  wrapUp: string; status: 'completed' }
  | { type: 'error';          message: string }
```

---

## 🎯 Built-in Agents (10 + MindX)

| # | Agent | Icon | Specialty | Signature Question |
|---|---|---|---|---|
| 0 | MindX (Orchestrator) | 🧠 | Điều phối, không có domain | — |
| 1 | Business Strategist | 💼 | ROI, market, competition | "Ai trả tiền và tại sao?" |
| 2 | Software Engineer | 👨‍💻 | Tech stack, feasibility, scale | "Build được không? Cost bao nhiêu?" |
| 3 | UX Designer | 🎨 | User behavior, friction, flow | "User thực sự cảm thấy gì?" |
| 4 | Security Expert | 🔒 | Vulnerabilities, compliance | "Điểm yếu nằm ở đâu?" |
| 5 | Data Scientist | 📊 | Metrics, evidence, patterns | "Số liệu nói gì?" |
| 6 | Legal Advisor | ⚖️ | Risk, compliance, contracts | "Điều gì có thể kiện được?" |
| 7 | Creative Director | ✨ | Narrative, differentiation | "Điều gì sẽ được nhớ mãi?" |
| 8 | Ethicist | 🌍 | Second-order effects, fairness | "Ai bị ảnh hưởng không tốt?" |
| 9 | Market Analyst | 📈 | Trends, competitors, TAM | "Thị trường đang đi đâu?" |
| 10 | Devil's Advocate | 😈 | Challenge mọi assumption | "Tại sao cái này sẽ fail?" |

---

## 🔁 Core Meeting Loop (MindX Orchestrator)

```
[Pool Created]
      ↓
[MindX] → announce: chọn agent mở đầu phù hợp nhất
      ↓
[Agent X] → full thinking + response (SSE stream)
      ↓
[Parallel] → listening agents chạy relevance check (MiniMax, cheap)
      ↓ chỉ agents Listening, skip agents vừa nói / đang trong queue
[Queue Updated] → agents có relevance raise hand → append FIFO
      ↓
[Stop Check] → queue empty + user trigger? → nếu ≥ 2 → wrap-up
      ↓ (chưa đủ)
[MindX] → cấp quyền cho agent đầu queue
      ↓
... loop ...
      ↓ (đủ stop signals)
[MindX] → wrap-up message (đồng thuận, bất đồng, action items)
[Pool Complete]
```

---

## ✅ Definition of Done

- [ ] Pool tạo được qua Setup Chat → agents thảo luận ít nhất 3-5 lượt không lỗi
- [ ] Relevance check chạy đúng (chỉ Listening agents, không duplicate queue)
- [ ] Agent panel cập nhật real-time 4 states qua SSE
- [ ] Thinking block toggle mượt, hiển thị đúng thời gian
- [ ] Sidebar navigate đúng giữa conversations ↔ meetings
- [ ] Welcome Screen render đúng theo prototype
- [ ] History hiển thị pools grouped by time
- [ ] Settings lưu được thinking budget + max agents
- [ ] Deploy thành công không lỗi
- [ ] TypeScript strict — 0 errors
- [ ] E2E Playwright: setup-pool, meeting-room, history pass
