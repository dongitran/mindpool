# 🧠 Phase 2 — Core Features

> **Source:** [idea.md](../docs/idea.md) · [prototype.html](../docs/prototype.html)
> **Mục tiêu:** Nâng cấp MVP thành sản phẩm có chiều sâu — mindmap visualization, auto recap, MindX thông minh hơn, export, và UX hoàn thiện.
> **Prerequisite:** Phase 1 hoàn toàn ổn định — pool tạo/chạy end-to-end, SSE streaming ổn, queue FIFO hoạt động đúng.

---

## 📋 Scope

### ✅ Bao gồm
- [ ] Mindmap view real-time (React Flow)
- [ ] Split view — Chat + Mindmap song song, sync highlight
- [ ] Pool recap auto-generate (TL;DR + Action Items + Disagreements + Agent Scores)
- [ ] Recap Page — hiển thị recap object đầy đủ + mindmap snapshot
- [ ] MindX stop signals đầy đủ (5/5 signals, trigger khi 3/5)
- [ ] User interrupt → MindX pause queue → route agent → resume
- [ ] Context drift handling — agent tự re-evaluate trước khi phát biểu, drop nếu stale
- [ ] Debate loop detection — MindX phát hiện 2 agents loop ≥ 3 lần → can thiệp
- [ ] Queue empty proactive — MindX mời agent im lặng lâu nhất
- [ ] Meeting Temperature indicator (🟢 Productive / 🟡 Stalling / 🔴 Stuck)
- [ ] Export: mindmap PNG + recap PDF
- [ ] Settings nâng cao: LLMRouter per-slot config, recap_synthesis slot
- [ ] History nâng cao: Pinned pools, search/filter, recap summary trên card
- [ ] End Meeting button (user trigger stop signal #5 rõ ràng)
- [ ] Monitoring: health check + error logging cơ bản

### ❌ Không bao gồm
- Custom agent builder (Phase 3)
- Timeline view (Phase 3)
- Agent marketplace (Phase 3)
- Sharing / collaboration (Phase 3)
- RAG / document upload (Phase 3)
- Mobile responsive (Phase 3)
- User authentication (Phase 3)
- Jira / Notion integration (Phase 3)
- Thêm LLM providers mới (OpenAI, Gemini, DeepSeek — Phase 3)

---

## 📁 Folder Structure Changes (so với Phase 1)

```diff
  apps/web/src/
+     ├── components/mindmap/       # MindmapView, MindmapNode, MindmapEdge
+     ├── components/recap/         # RecapCard, RecapPage, AgentScoreBar
+     ├── components/meeting/       # +SplitView, +TemperatureBadge, +EndMeetingBtn
      ├── screens/
+     │   └── RecapScreen.ts        # Full recap page after pool complete
      └── hooks/
+         └── useMindmap.ts         # Transform messages → nodes/edges

  apps/server/src/
      ├── services/
+     │   ├── recap.service.ts      # Auto-generate recap qua LLMRouter
+     │   ├── temperature.service.ts # Meeting temperature detection
+     │   └── mindx.service.ts      # ← nâng cấp: interrupt, drift, debate, 5 signals
      ├── queue/
+     │   └── StopSignalDetector.ts  # ← nâng cấp: 5 signals thay vì 2
+     ├── utils/
+     │   └── similarity.ts         # Cosine similarity cho repetition detection
      └── llm/
          └── router.ts             # ← thêm callType: 'recap_synthesis'

  packages/shared/types/
+     └── mindmap.ts                # MindmapNode, MindmapEdge types
+     └── recap.ts                  # RecapObject type

  e2e/tests/
+     ├── mindmap.spec.ts
+     ├── recap.spec.ts
+     └── user-interrupt.spec.ts
```

---

## 🏗️ Technical Tasks

### 1. Mindmap View — React Flow

#### 1.1 Data Model (`packages/shared/types/mindmap.ts`)
```typescript
interface MindmapNode {
  id: string;
  label: string;        // Tóm tắt ngắn nội dung chính
  sub: string;           // "💼 Strategist"
  value: string;         // Kết luận: "React Native ✓" | "⚠️ PCI DSS" | "⏳ Pending"
  color: string;         // Màu theo agent
  agentId: string;
  messageId: string;     // Link đến message gốc trong feed
  parentId: string | null; // null = connect to center
}

interface MindmapEdge {
  id: string;
  source: string;        // nodeId
  target: string;        // nodeId
  animated?: boolean;    // true cho node mới
}
```

#### 1.2 Backend — Mindmap Node Generation
- [ ] Sau mỗi agent phát biểu (full response), **MindX gọi thêm 1 cheap LLM call** để extract:
  - `label` — chủ đề chính agent vừa nói (3-5 từ)
  - `value` — kết luận/trạng thái (VD: "RN recommended ✓", "⚠️ PCI concern")
  - `parentId` — node nào đang được build on (null nếu topic mới)
- [ ] Lưu `mapNodes[]` vào Pool document (đã có stub từ Phase 1)
- [ ] SSE event mới: `mindmap_node_added` — push node mới về client
- [ ] Mỗi agent có màu cố định (map từ `constants/agents.ts`)

#### 1.3 Frontend — MindmapView Component
- [ ] Tích hợp `@xyflow/react` (React Flow v12) vào `apps/web`
- [ ] `MindmapView` component:
  - Center node: Pool title + subtitle + status (giống `mindpool.html` buildMindmap)
  - Child nodes: render từ `pool.mapNodes[]`
  - Edges: từ center → child, hoặc child → child (parentId)
  - Node styling: rounded rect, agent color border, label + sub + value text
  - Glow effect cho center node (radial gradient)
  - Legend box: Discussed ✓ / Pending ⏳ / Warning ⚠️
- [ ] Real-time: khi nhận SSE `mindmap_node_added` → animate node mới vào
- [ ] `fitView()` sau mỗi node mới để auto-zoom
- [ ] Click node → emit event cho SplitView sync

#### 1.4 Tham khảo prototype
Mindmap hiện tại trong `mindpool.html` dùng raw SVG (L1067-1090). Phase 2 chuyển sang React Flow để có:
- Drag/zoom/pan interactive
- Auto-layout (dagre)
- Click node → highlight message

---

### 2. Split View

- [ ] View tabs mở rộng: 💬 Chat | 🗺 Mindmap | 🔀 Split (Phase 1 chỉ có Chat, Mindmap disabled)
- [ ] `SplitView` component:
  ```
  ┌─────────────────────┬──────────────────────────┐
  │   AgentsPanel (210)  │                           │
  │   DiscussionFeed     │      MindmapView          │
  │   (resizable)        │      (resizable)          │
  └─────────────────────┴──────────────────────────┘
  ```
- [ ] Resizable divider (drag handle giữa 2 panel) — min 30% mỗi bên
- [ ] **Bi-directional sync**:
  - Click mindmap node → scroll feed đến message tương ứng (highlight 2s)
  - Click message trong feed → highlight node tương ứng trên mindmap (pulse animation)
- [ ] Persist view preference trong `settingsStore` (localStorage)
- [ ] URL query param: `?view=split` / `?view=mindmap`

---

### 3. Pool Recap Auto-Generate

#### 3.1 Recap Object (`packages/shared/types/recap.ts`)
```typescript
interface RecapObject {
  summary: string[];           // 3-5 bullet points TL;DR
  agreements: string[];        // Điểm agents đồng thuận
  disagreements: string[];     // Điểm agents bất đồng
  actionItems: ActionItem[];   // Việc cần làm
  agentScores: AgentScore[];   // Agent contribution ranking
  mindmapSnapshot: MindmapNode[]; // Frozen mindmap state
  generatedAt: Date;
}

interface ActionItem {
  text: string;
  priority: 'high' | 'medium' | 'low';
  suggestedOwner?: string;     // Agent nào suggest
}

interface AgentScore {
  agentId: string;
  agentName: string;
  icon: string;
  contributions: number;      // Số lượng messages
  keyInsights: string[];      // Top insights agent đưa ra
  score: number;              // 0-100 normalized
}

// Scoring Algorithm:
// score = weighted sum, normalized to 0-100
//   - Message count / total messages           × 20%  (contribution volume)
//   - Queue triggers (self raise hand count)   × 25%  (proactiveness)
//   - Unique insights (new mindmap branches    × 30%  (quality — đếm từ mindmap nodes agent tạo)
//     created by agent)
//   - User engagement (số lần user hỏi trực   × 25%  (relevance to user)
//     tiếp agent qua @mention hoặc MindX route)
// → Agent có score cao nhất = "MVP contributor" badge trên recap
```

#### 3.2 Backend — Recap Service
- [ ] `recap.service.ts`:
  - Trigger: khi `pool_complete` event → auto-generate recap
  - Dùng `LLMRouter.agentChat(callType: 'recap_synthesis')`
  - Default config: `recap_synthesis → minimax-text-01` (4M context — đủ cho meeting dài)
  - Feed toàn bộ pool messages (thinking + content) vào 1 prompt
  - Prompt template extract: summary, agreements, disagreements, actionItems, agentScores
  - Parse LLM output → `RecapObject`
  - Lưu vào `Pool.recap` trong MongoDB
  - Copy `Pool.mapNodes` → `recap.mindmapSnapshot`
- [ ] `GET /api/pool/:id/recap` — return recap object
- [ ] SSE event mới: `recap_ready` — notify client khi recap đã generate xong

#### 3.3 Frontend — Recap UI
- [ ] `RecapCard` component (inline trong Meeting Room — show sau pool_complete):
  - Compact view: TL;DR + "Xem recap đầy đủ →"
  - Expandable section cho action items
- [ ] `RecapScreen` (full page, navigate từ history hoặc meeting):
  - Header: pool title + agents + duration + date
  - TL;DR section (bulleted)
  - ✓ Đồng thuận section
  - ⚠️ Bất đồng section
  - Action Items list (priority badges)
  - Agent Contribution chart (horizontal bar chart, sorted by score)
  - Mindmap snapshot (React Flow, read-only, no interaction)
- [ ] History cards cập nhật: show recap summary snippet trên card (nếu pool completed + recap exists)

---

### 4. MindX Stop Signals (5/5 đầy đủ)

Nâng cấp `StopSignalDetector.ts` từ 2/5 → 5/5:

| Signal | Điều kiện | Implementation |
|---|---|---|
| **1. Queue trống** | Không agent nào raise hand sau turn vừa rồi | Giữ nguyên từ Phase 1 |
| **2. Repetition** | Nội dung mới trùng lặp ≥ 70% với messages đã có | Cosine similarity (TF-IDF hoặc sentence embedding) |
| **3. Convergence** | Agents đang đồng thuận thay vì tranh luận | LLM cheap call: "Các agents còn tranh luận không?" → binary |
| **4. Coverage** | Tất cả angle của topic đã được address | LLM cheap call: "Topic ban đầu đã cover đủ chưa?" → binary |
| **5. User trigger** | "okay", "cảm ơn", "đủ rồi", hoặc nhấn End button | Giữ nguyên + thêm End button |

- [ ] `utils/similarity.ts` — cosine similarity cho Signal 2:
  - Tokenize messages → TF-IDF vectors
  - So sánh message mới vs tất cả messages trước đó
  - Threshold: ≥ 0.70 → signal active
- [ ] Signal 3 + 4: dùng cheap LLM call (MiniMax M2.5, cùng batch với relevance check)
- [ ] Logic: đếm active signals → khi ≥ 3/5 → trigger `pool_complete`
- [ ] Khi dừng, MindX gọi full LLM để generate wrap-up message format:
  ```
  ✓ Đồng thuận: [points]
  ⚠️ Cần lưu ý: [points]
  ❓ Còn open: [points]
  Action items: [numbered list]
  ```
- [ ] SSE event: `stop_signal_update` — broadcast signal states cho frontend (optional debug UI)
- [ ] Frontend: "End Meeting" button trong topbar → gửi `POST /api/pool/:id/end` → trigger Signal 5

---

### 5. Advanced MindX — Edge Cases

#### 5.1 User Interrupt (idea.md L435-450)
- [ ] Khi user gửi tin giữa meeting (POST /api/pool/:id/message):
  ```
  1. MindX: pause queue (giữ nguyên thứ tự)
  2. MindX phân tích câu hỏi → xác định agent phù hợp nhất
     - Dùng cheap LLM: "User hỏi: [message]. Agent nào phù hợp nhất? [list agents]"
  3. Agent đó trả lời trực tiếp user (full response)
  4. MindX: resume queue từ đúng chỗ đã dừng
  ```
- [ ] SSE events: `queue_paused`, `queue_resumed`
- [ ] Frontend: visual indicator khi queue đang paused (amber border trên Agents Panel)
- [ ] Phân biệt: user message trong meeting ≠ user message trong setup chat

#### 5.2 Context Drift (idea.md L426-433)
- [ ] Trước khi cấp quyền (popFromQueue), agent phải re-evaluate:
  ```
  Agent nhận full context hiện tại (tất cả messages từ khi raise hand)
  → Cheap LLM call: "Góc nhìn ban đầu của bạn còn relevant không?"
  → Nếu KHÔNG → tự drop khỏi queue, MindX announce: "[Agent] rút khỏi queue"
  → Nếu CÓ → phát biểu bình thường (nhưng có thể adjust content)  
  ```
- [ ] SSE event: `agent_dropped` — khi agent tự drop
- [ ] UI: agent card flash + fade từ queued → listening (animation)

#### 5.3 Debate Loop Detection (idea.md L452-463)
- [ ] `mindx.service.ts` track: agent history trong queue
  - Nếu cùng 2 agents xuất hiện trong queue liên tiếp ≥ 3 lần:
    ```
    MindX can thiệp: "Điểm bất đồng cốt lõi là X.
                      Agent nào có góc nhìn thứ 3 không?"
    ```
  - Mời agent đang Listening lâu nhất vào làm **arbitrator**
  - Arbitrator nhận context debate + được prompt: "Đưa ra góc nhìn thứ 3 để break tie"
- [ ] SSE event: `debate_intervention` — MindX can thiệp message

#### 5.4 Queue Empty Proactive (idea.md L418-424)
- [ ] Khi queue trống sau 1 turn (trước khi tính stop signal):
  ```
  Bước 1: MindX kiểm tra agent nào im lặng lâu nhất
  Bước 2: MindX gửi message: "[Agent] — góc nhìn [specialty] ở đây thế nào?"
  Bước 3: Agent đó được "nominated" → full response
  Bước 4: Nếu agent pass (không có gì thêm) → tính là 1 stop signal
  ```
- [ ] Track `lastSpoke` timestamp per agent

---

### 6. Meeting Temperature (idea.md L495-503)

- [ ] `temperature.service.ts`:
  - Analyze meeting state mỗi N turns (hoặc mỗi 60s):
    | State | Detection Logic |
    |---|---|
    | 🟢 Productive | Mỗi turn có insight mới (similarity < 0.5 vs previous), queue active |
    | 🟡 Stalling | Queue thưa (< 2 agents), messages bắt đầu repeat (similarity 0.5-0.7) |
    | 🔴 Stuck | 2 agents loop debate, hoặc similarity > 0.7 consecutive |
  - MindX auto-intervene khi 🟡 hoặc 🔴
- [ ] SSE event: `temperature_update` — `{ level: 'productive' | 'stalling' | 'stuck' }`
- [ ] Frontend `TemperatureBadge` component:
  - Show bên cạnh status dot trong topbar
  - Tooltip giải thích: "Cuộc họp đang productive" / "Agents bắt đầu lặp lại"
  - Color: green/amber/red theo level

---

### 7. Export

#### 7.1 Mindmap PNG
- [ ] Button "📥 Export Mindmap" trong Mindmap view
- [ ] Dùng React Flow's `toObject()` → `html2canvas` hoặc `@xyflow/react` built-in export
- [ ] Download as `mindpool-{pool-title}-mindmap.png`

#### 7.2 Recap PDF
- [ ] Button "📥 Export PDF" trong Recap page
- [ ] Backend endpoint: `GET /api/pool/:id/recap/pdf`
- [ ] Dùng `puppeteer` hoặc `@react-pdf/renderer` (server-side) — render recap thành PDF
- [ ] PDF layout:
  - Header: Mindpool logo + pool title + date + agents
  - TL;DR section
  - Agreements / Disagreements
  - Action Items table
  - Agent Scores chart
  - Mindmap snapshot (embedded PNG)
- [ ] Download as `mindpool-{pool-title}-recap.pdf`

---

### 8. Settings Nâng Cao

Mở rộng Settings screen từ Phase 1:

#### 8.1 LLMRouter Per-Slot Config
- [ ] UI: dropdown cho mỗi slot, hiển thị provider + model:
  | Slot | Default | Có thể chọn |
  |---|---|---|
  | `full_response` | Kimi K2 | Kimi K2 / Kimi K2.5 / MiniMax M2.5 |
  | `relevance_check` | MiniMax M2.5 | MiniMax M2.5 / Kimi K2 |
  | `recap_synthesis` | MiniMax Text-01 | MiniMax Text-01 / Kimi K2.5 |
- [ ] Backend: `PUT /api/settings/llm-router` — lưu RouterConfig
- [ ] Settings store (Zustand) sync với backend

#### 8.2 Các toggle mới
- [ ] "End Meeting" button visibility toggle
- [ ] Meeting Temperature display toggle
- [ ] Auto-generate recap toggle (on by default)

---

### 9. History Nâng Cao

Mở rộng History screen từ Phase 1:

- [ ] **Pinned pools**: pin/unpin button trên card → pinned section ở đầu (idea.md L583-588)
- [ ] **Search**: search bar filter pools by title/topic
- [ ] **Recap preview**: show recap summary (nếu có) trên history card
  - "💡 Recommend PWA first → React Native khi đủ traction"
- [ ] **Pool status badges**: cập nhật — Live / Completed / Archived
- [ ] **Archive pool**: swipe/long-press → archive (soft delete)
- [ ] **Pool duration**: hiển thị trên card (VD: "22 min")

---

### 10. Monitoring & Stability

- [ ] `GET /api/health` — health check endpoint (MongoDB + Redis + LLM providers ping)
- [ ] Basic error logging:
  - `winston` logger (JSON format) cho server
  - Categorize: `[LLM_ERROR]`, `[SSE_ERROR]`, `[DB_ERROR]`, `[QUEUE_ERROR]`
- [ ] SSE connection stability:
  - Server-side heartbeat (ping every 15s)
  - Client-side reconnect with exponential backoff
  - `last_event_id` cho SSE resume
- [ ] Error boundary React component cho frontend crashes
- [ ] Rate limiting: basic rate limit cho API endpoints (express-rate-limit)

---

## 📐 New SSE Events (Phase 2 additions)

```typescript
// Phase 2 additions to SSEEvent union
type SSEEventP2 =
  | { type: 'mindmap_node_added'; node: MindmapNode }
  | { type: 'recap_ready';        poolId: string }
  | { type: 'stop_signal_update'; signals: { [key: string]: boolean }; activeCount: number }
  | { type: 'queue_paused';       reason: 'user_interrupt' }
  | { type: 'queue_resumed' }
  | { type: 'agent_dropped';      agentId: string; reason: 'context_drift' }
  | { type: 'debate_intervention'; content: string; arbitratorId: string }
  | { type: 'temperature_update'; level: 'productive' | 'stalling' | 'stuck' }
  | { type: 'heartbeat' }
```

---

## 🗄️ Schema Changes (so với Phase 1)

### Pool — thêm fields
```diff
  Pool {
    ...Phase 1 fields...
+   recap: RecapObject | null,    // null trước khi recap generate
+   temperature: 'productive' | 'stalling' | 'stuck',
+   isPinned: boolean,
+   archivedAt: Date | null,
    mapNodes: MindmapNode[],      // ← Phase 1 là stub [], Phase 2 populate
+   mapEdges: MindmapEdge[],
  }
```

### Message — thêm fields
```diff
  Message {
    ...Phase 1 fields...
+   mindmapNodeId: string | null,  // Link message → mindmap node
+   isInterrupt: boolean,          // true nếu user interrupt message
  }
```

### New: Settings document
```typescript
Settings {
  userId: string,         // "default" cho single-user mode
  llmRouter: {
    full_response:   { provider: string, model: string },
    relevance_check: { provider: string, model: string },
    recap_synthesis: { provider: string, model: string },
  },
  thinkingBudget: number,    // seconds
  maxAgentsPerPool: number,
  autoStart: boolean,
  showThinkingDefault: boolean,
  autoRecap: boolean,
  showTemperature: boolean,
  accentColor: string,
  compactSidebar: boolean,
}
```

---

## 🔁 Updated Meeting Loop (Phase 2)

```
[Pool Created]
      ↓
[MindX] → announce + chọn agent mở đầu
      ↓
[Agent X] → thinking + response (SSE stream)
      ↓
[MindX] → extract mindmap node từ response → SSE: mindmap_node_added
      ↓
[Parallel] → listening agents relevance check (MiniMax, cheap)
           → MindX check: repetition (cosine sim) + convergence + coverage (cheap LLM)
      ↓
[Queue Updated] → FIFO append, max depth 3-4
      ↓
[Temperature Check] → 🟢/🟡/🔴 → SSE: temperature_update
      ↓
[Stop Signal Check] → 5 signals → nếu ≥ 3/5:
      ↓ (chưa đủ)                    ↓ (đủ)
[Queue empty?]                  [MindX wrap-up]
  ├─ Có agents → context       [Pool Complete]
  │  drift check → nếu         [Recap auto-generate]
  │  still relevant →           [SSE: recap_ready]
  │  full response      
  ├─ Queue empty →
  │  MindX mời agent
  │  im lặng lâu nhất
  │  (proactive)
  ↓
[User interrupt?]
  ├─ Có → pause queue → route agent → respond → resume
  ├─ Không → continue loop
  ↓
[Debate loop?]
  ├─ Có → MindX can thiệp → mời arbitrator
  ├─ Không → continue loop
  ↓
... loop ...
```

---

## ✅ Definition of Done

- [ ] Mindmap render real-time, node mới animate vào khi agent phát biểu
- [ ] Split view sync bi-directional: click node ↔ highlight message
- [ ] Recap auto-generate sau mỗi completed pool — hiển thị đúng: summary, agreements, disagreements, action items, agent scores
- [ ] Export PDF recap + PNG mindmap download thành công
- [ ] MindX dừng đúng khi đủ 3/5 signals
- [ ] User interrupt: gửi tin giữa meeting → queue pause → agent respond → resume đúng chỗ
- [ ] Context drift: agent tự drop nếu context cũ, UI animate đúng
- [ ] Debate loop: MindX detect loop ≥ 3 lần → can thiệp + mời arbitrator
- [ ] Temperature badge cập nhật correct, MindX intervene khi Stalling/Stuck
- [ ] Settings LLM router per-slot lưu và apply đúng
- [ ] History: pin/unpin, search, recap preview trên card
- [ ] "End Meeting" button hoạt động đúng
- [ ] Health check endpoint return OK
- [ ] SSE reconnect không mất data (heartbeat + last_event_id)
- [ ] E2E Playwright: mindmap, recap, user-interrupt tests pass
- [ ] TypeScript strict — 0 errors

---

## 📌 Dependencies & Risks

| Risk | Impact | Mitigation |
|---|---|---|
| React Flow bundle size lớn | Tăng FCP | Lazy load mindmap component |
| Recap LLM call với meeting dài (nhiều messages) | Vượt context window | Dùng MiniMax Text-01 (4M tokens), hoặc chunk + summarize trước |
| Cosine similarity tính toán nặng | Slow stop signal check | Pre-compute TF-IDF vectors, cache |
| SSE reconnect mất events | User thấy data không đồng bộ | Server-side event buffer + last_event_id |
| PDF generation server-side (puppeteer) | Memory-intensive | Dùng @react-pdf/renderer thay vì puppeteer nếu được |
