# 🔗 Plan 03 — Bridge Setup Phase → Meeting Room

> **Problem:** Clicking "Bắt đầu Meeting" navigates to an empty meeting room with 0 agents.
> **Root cause:** `api.createPool()` is never called — no pool is created, no `meetingId` is stored.

---

## 🧭 Luồng Xử Lý Chi Tiết (Detailed Processing Flow)

> Phần này mô tả **toàn bộ luồng xử lý end-to-end** từ lúc user gõ topic đến khi agents bắt đầu thảo luận trong meeting room. Bao gồm 3 pha chính, state transitions, và tất cả các tình huống xảy ra.

### Pha 1: Setup — User gõ topic → MindX gợi ý agents

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND (SetupScreen.tsx)                                         │
│                                                                      │
│  1. User gõ: "Tôi muốn thảo luận về AI trong giáo dục"              │
│     ↓                                                                │
│  2. handleSend(content) — SetupScreen.tsx L120                       │
│     ├─ Tạo userMsg { type: 'user', content }                        │
│     ├─ setMessages([...prev, userMsg])                               │
│     ├─ setIsTyping(true) → hiện TypingIndicator                     │
│     ├─ Nếu chưa có conversationId → POST /api/conversations         │
│     │   → Server tạo Conversation trong MongoDB                      │
│     │   → skipNextFetch.current = true (tránh double-fetch)          │
│     │   → setCurrentConversation(convId)                             │
│     └─ POST /api/conversations/:id/message { content }               │
│                                                                      │
│  3. Server xử lý message (conversations.ts L66-345):                │
│     ├─ Lưu user message vào conversation.messages[]                  │
│     ├─ Chuẩn bị chatHistory cho LLM (system prompt + lịch sử)       │
│     ├─ System prompt chứa AVAILABLE AGENTS list từ DB               │
│     ├─ Gọi LLM (Kimi/MiniMax) với streaming                        │
│     │                                                                │
│     │  ┌─ SSE Stream Events gửi về frontend: ─────────────────────┐ │
│     │  │  data: { type: 'thinking_chunk', content: '...' }        │ │
│     │  │  data: { type: 'thinking_done' }                          │ │
│     │  │  data: { type: 'chunk', content: 'Tuyệt vời! ...' }     │ │
│     │  │  data: { type: 'agents_suggested', agents: [{...}] }     │ │
│     │  │  data: { type: 'done', conversation: {...} }              │ │
│     │  └──────────────────────────────────────────────────────────┘ │
│     │                                                                │
│     ├─ Khi LLM trả về [READY] + [AGENT: id]:                       │
│     │   ├─ Tìm agent trong DB bằng Agent.findById(agentId)          │
│     │   ├─ Gửi SSE event 'agents_suggested' (từng agent một)       │
│     │   └─ Clean content: remove [READY], [AGENT:...] tags          │
│     │                                                                │
│     └─ Lưu message vào MongoDB:                                     │
│        {                                                             │
│          type: 'bot-agents',                                         │
│          intro: cleanContent,     // "Dưới đây là các chuyên gia.." │
│          agents: [                // Mảng agent objects              │
│            { agentId, icon, name, desc, checked: true }              │
│          ],                                                          │
│          thinking: '...',         // Reasoning content               │
│          btnId: `start-btn-${conversationId}-${Date.now()}`         │
│          // ^^ UNIQUE per suggestion block (Step 0 fix)              │
│        }                                                             │
│                                                                      │
│  4. Frontend nhận SSE events → cập nhật UI real-time:               │
│     ├─ onThinkingChunk → ThinkingBlock hiện "💭 Đang suy nghĩ..."  │
│     ├─ onThinkingDone → ThinkingBlock chuyển sang "💭 Thought..."   │
│     ├─ onChunk → nối content vào bot message bubble                  │
│     ├─ onAgents → message.type chuyển sang 'bot-agents'             │
│     │   → Mỗi agent card xuất hiện với animation (Framer Motion)     │
│     │   → Mặc định checked: true (user có thể uncheck)              │
│     └─ onDone → setMessages(finalConversation.messages)              │
│                                                                      │
│  5. UI State sau khi hoàn tất Pha 1:                                │
│     ┌──────────────────────────────────────────┐                     │
│     │  🧠 MindX                                │                     │
│     │  "Tuyệt vời! Tôi đề xuất các chuyên.."  │                     │
│     │                                           │                     │
│     │  ☑ 🎓 Prof. Education — Giáo dục học     │                     │
│     │  ☑ 🤖 Dr. AI — Trí tuệ nhân tạo         │                     │
│     │  ☑ 📊 Analyst — Phân tích dữ liệu       │                     │
│     │                                           │                     │
│     │  [🚀 Bắt đầu Meeting]                    │                     │
│     └──────────────────────────────────────────┘                     │
│     - User có thể CHECK/UNCHECK agents                               │
│     - handleToggleAgent(btnId, agentId) — L331                       │
│       → flip agent.checked trong messages state                      │
│     - Chỉ agents có checked=true sẽ được gửi lên createPool         │
└──────────────────────────────────────────────────────────────────────┘
```

### Pha 2: Pool Creation — User nhấn "Bắt đầu Meeting"

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND — handleStartMeeting(btnId) — SetupScreen.tsx L245        │
│                                                                      │
│  Bước 2.1: Validate & Prepare                                       │
│  ├─ Guard: if (creatingPool) return  → chặn double-click            │
│  ├─ Tìm bot-agents message bằng btnId:                              │
│  │   messages.find(m => m.type === 'bot-agents' && m.btnId === btnId)│
│  ├─ Lấy checked agent IDs:                                          │
│  │   agents.filter(a => a.checked).map(a => a.agentId)              │
│  ├─ Nếu checkedAgentIds.length === 0:                               │
│  │   → Hiện cảnh báo "⚠️ Hãy chọn ít nhất 1 agent..."             │
│  │   → return (KHÔNG tạo pool)                                      │
│  └─ Tìm topic: duyệt messages ngược lên tìm message type='user'    │
│     gần nhất trước agent suggestion block                            │
│     → Nếu không tìm thấy → fallback: topic = 'Discussion'          │
│                                                                      │
│  Bước 2.2: UI Loading State                                         │
│  ├─ setCreatingPool(btnId)                                          │
│  │   → creatingPool === msg.btnId → isLoading=true                  │
│  │   → SetupScreen truyền isLoading → MessageBubble → AgentSuggestion│
│  └─ Button chuyển: "🚀 Bắt đầu Meeting" → "⏳ Đang tạo Meeting..."│
│     + disabled=true + opacity-70 + cursor-not-allowed                │
│                                                                      │
│  Bước 2.3: API Call                                                  │
│  POST /api/pool/create { topic, agentIds, conversationId }           │
│  ↓                                                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  BACKEND — pool.ts L12-53                                      │  │
│  │                                                                 │  │
│  │  2.3a. poolService.createPool(topic, agentIds, conversationId) │  │
│  │        → Tạo Pool document trong MongoDB                       │  │
│  │        → Pool.agents = agentIds.map(id => AgentRef{...})       │  │
│  │        → Pool.status = 'active'                                │  │
│  │        → Pool.conversationId = conversationId                  │  │
│  │                                                                 │  │
│  │  2.3b. mindxService.generateAnnouncement(poolId)               │  │
│  │        → MindX tạo message mở đầu cho meeting                 │  │
│  │        → Lưu vào Pool.messages[] type='mindx'                  │  │
│  │        → Broadcast SSE event: { type: 'mindx_announce' }       │  │
│  │                                                                 │  │
│  │  2.3c. mindxService.selectOpeningAgent(topic, agents)          │  │
│  │        → LLM chọn agent nào nên nói đầu tiên                  │  │
│  │        → queueManager.addToQueue(openingAgent.agentId)         │  │
│  │                                                                 │  │
│  │  2.3d. redis.rpush(MEETING_QUEUE_KEY, { poolId })              │  │
│  │        → Đưa job vào Redis queue cho Worker xử lý              │  │
│  │                                                                 │  │
│  │  2.3e. res.status(201).json(pool)                              │  │
│  │        → Trả về Pool { _id, title, agents, status, ... }      │  │
│  │                                                                 │  │
│  │  ⚠️ Nếu bước 2.3b-2.3d fail:                                  │  │
│  │     → Pool bị rollback: Pool.findByIdAndDelete(poolId)         │  │
│  │     → Nếu rollback cũng fail: CRITICAL log "zombie pool"      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Bước 2.4: Update Local State (sau khi API thành công)              │
│  ├─ setMessages: Tìm message có btnId → transform:                  │
│  │   {                                                               │
│  │     type: 'bot-agents' → 'bot-created',                          │
│  │     meetingId: pool._id,                                          │
│  │     meetingTitle: pool.title,                                     │
│  │     agentBadges: ["🎓 Prof. Education", "🤖 Dr. AI", ...]       │
│  │   }                                                               │
│  │   → UI chuyển từ agent cards + button → "✓ Created" card         │
│  │                                                                   │
│  │   ┌──────────────────────────────────────────┐                    │
│  │   │  ✓ CREATED                               │                    │
│  │   │  🧠 AI trong giáo dục — phân tích đa chiều│                   │
│  │   │  [🎓 Prof. Education] [🤖 Dr. AI] [📊..] │                   │
│  │   │  [→ Vào Meeting Room]                     │                    │
│  │   └──────────────────────────────────────────┘                    │
│  │                                                                   │
│  ├─ MessageBubble render: message.type === 'bot-created'            │
│  │   → meetingCreated=true → AgentSuggestion hiện "→ Vào Meeting"   │
│  │   → HOẶC MessageBubble render 'bot-created' block trực tiếp     │
│  │   (tuỳ vào việc message đã chuyển type hay chưa)                  │
│  │                                                                   │
│  └─ Lưu ý: Lúc này UI đã update nhưng DB vẫn còn type='bot-agents' │
│                                                                      │
│  Bước 2.5: Persist to Server (fire-and-forget)                      │
│  ├─ PATCH /api/conversations/:id/link-meeting                       │
│  │   Body: { btnId, meetingId: pool._id, meetingTitle: pool.title } │
│  │   ↓                                                               │
│  │   ┌────────────────────────────────────────────────────────────┐  │
│  │   │  BACKEND — conversations.ts L347-377                       │  │
│  │   │                                                             │  │
│  │   │  1. Validate: btnId + meetingId required (400 nếu thiếu)  │  │
│  │   │  2. Conversation.findById(conversationId)                  │  │
│  │   │  3. messages.findIndex(m => m.btnId === btnId)             │  │
│  │   │  4. Update message:                                        │  │
│  │   │     - type: 'bot-agents' → 'bot-created'                  │  │
│  │   │     - meetingId = pool._id                                 │  │
│  │   │     - meetingTitle = pool.title                             │  │
│  │   │     - agentBadges = agents.map(a => `${a.icon} ${a.name}`) │  │
│  │   │  5. conversation.save() → trigger updatedAt                │  │
│  │   │  6. res.json({ ok: true })                                 │  │
│  │   └────────────────────────────────────────────────────────────┘  │
│  │                                                                   │
│  ├─ .catch(err => console.error('Failed to link meeting:', err))    │
│  │   → Lỗi ở đây KHÔNG block navigation hay user flow              │
│  │   → Pool + local state vẫn đúng                                  │
│  └─ Nhưng nếu fail: reload page → message hiện lại "Bắt đầu Meeting"│
│                                                                      │
│  Bước 2.6: Cache Invalidation + Navigation                          │
│  ├─ queryClient.invalidateQueries(['conversations'])                │
│  │   → Sidebar refetch conversations → hiện updated title           │
│  ├─ queryClient.invalidateQueries(['pools'])                        │
│  │   → Sidebar refetch pools → meeting chip xuất hiện dưới conv     │
│  ├─ setTimeout(() => navigateToMeeting(pool._id), 600)              │
│  │   → 600ms delay cho user thấy "✓ Created" card trước khi chuyển │
│  └─ setCreatingPool(null) — trong finally block                     │
│     → Reset loading state (dù success hay failure)                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Pha 3: Meeting Room — Agents thảo luận

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND — MeetingScreen.tsx                                        │
│                                                                      │
│  3.1. navigateToMeeting(poolId) — appStore.ts                       │
│       → currentScreen = 'meeting'                                    │
│       → currentMeetingId = poolId                                    │
│                                                                      │
│  3.2. useMeeting(poolId) hook:                                       │
│       ├─ api.getPool(poolId) → GET /api/pool/:id                    │
│       │   → Pool { _id, title, agents: AgentRef[], messages, ... }  │
│       │   → meetingStore.setPool(pool) → agents + messages loaded    │
│       └─ Nếu pool.status === 'active' → tiếp tục SSE               │
│                                                                      │
│  3.3. useSSE(poolId) hook:                                           │
│       ├─ EventSource → GET /api/stream/:poolId                      │
│       │   (Có ?after=lastMessageTime để tránh duplicates)            │
│       │                                                              │
│       │   Server-side (stream.ts):                                   │
│       │   - broadcastService tracks connected clients                │
│       │   - Gửi heartbeat mỗi 30s                                   │
│       │   - Push events khi có thay đổi trong pool                  │
│       │                                                              │
│       └─ SSE Events nhận được:                                       │
│                                                                      │
│  ┌──── Worker (worker.ts) — BLPOP từ Redis ────────────────────────┐│
│  │                                                                   ││
│  │  worker.ts BLPOP(MEETING_QUEUE_KEY) → { poolId }                ││
│  │  ↓                                                                ││
│  │  handleMeetingLoop(poolId) — mindx.service.ts                    ││
│  │  ↓                                                                ││
│  │  Loop cho đến khi queue rỗng hoặc stop signal:                   ││
│  │                                                                   ││
│  │  Vòng lặp 1 (Opening Agent):                                     ││
│  │  ├─ queueManager.dequeue() → lấy agentId tiếp theo              ││
│  │  ├─ Broadcast: { type: 'agent_state', state: 'speaking' }       ││
│  │  ├─ Broadcast: { type: 'thinking_start', agentId }              ││
│  │  ├─ LLM streaming response với context:                          ││
│  │  │   - Pool topic + lịch sử messages                            ││
│  │  │   - Agent persona (role, specialty, system prompt)             ││
│  │  │   - Instructions: respond to topic, raise hand if want more   ││
│  │  ├─ Broadcast: { type: 'thinking_end', thinkSec: 5.2 }          ││
│  │  ├─ Broadcast: { type: 'agent_chunk', content: '...' }   (x N)  ││
│  │  ├─ Broadcast: { type: 'agent_message', message: {...} }         ││
│  │  ├─ Detect [RAISE_HAND: agentId] trong response                  ││
│  │  │   → queueManager.addToQueue(raisedAgentId)                    ││
│  │  ├─ Broadcast: { type: 'queue_update', queue: [...] }            ││
│  │  └─ Broadcast: { type: 'agent_state', state: 'listening' }      ││
│  │                                                                   ││
│  │  Vòng lặp 2..N (Subsequent Agents):                               ││
│  │  ├─ (Lặp lại pattern trên cho từng agent trong queue)            ││
│  │  ├─ MindX kiểm tra relevance sau mỗi agent response             ││
│  │  └─ StopSignalDetector: dừng khi queue rỗng + 2 empty rounds    ││
│  │                                                                   ││
│  │  Kết thúc:                                                        ││
│  │  ├─ Broadcast: { type: 'pool_status', status: 'completed' }     ││
│  │  └─ Pool.status = 'completed' trong MongoDB                      ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  3.4. Frontend xử lý SSE events → update meetingStore:              │
│       ├─ 'mindx_announce' → messages.push(mindx message)            │
│       ├─ 'agent_state' → agents[agentId].state = 'speaking'|...     │
│       │   → AgentsPanel update avatar state (wave animation)         │
│       ├─ 'thinking_start' → typingMessage = { agentId, thinking }   │
│       ├─ 'agent_chunk' → typingMessage.content += chunk              │
│       │   → DiscussionFeed hiện typing bubble real-time              │
│       ├─ 'agent_message' → messages.push(full message)               │
│       │   → Typing bubble biến mất, full message xuất hiện           │
│       ├─ 'queue_update' → agents queuePosition = [0, 1, 2, ...]     │
│       │   → AgentsPanel hiện: 🎤 Speaking, ⏳ Queued, 👂 Listening  │
│       └─ 'pool_complete' → pool.status = 'completed'                │
│           → Hiện "Meeting đã kết thúc" trong UI                     │
│                                                                      │
│  3.5. Sidebar Integration — App.tsx:                                 │
│       ├─ pools.filter(p => p.conversationId === conv._id)           │
│       │   → Meeting chip hiện dưới conversation trong sidebar        │
│       └─ Click chip → navigateToMeeting(pool._id)                   │
│           → Chuyển thẳng vào meeting room                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Các Tình Huống (Scenarios)

#### Tình huống 1: Happy Path (Luồng chính)
```
User gõ topic → MindX suggest 3 agents → User giữ 3 agents checked
→ Click "Bắt đầu Meeting" → Button: "⏳ Đang tạo Meeting..."
→ POST /api/pool/create → Pool created + MindX announce + agent queued
→ UI: bot-agents → bot-created "✓ Created" card
→ PATCH link-meeting (fire-and-forget)
→ 600ms delay → MeetingScreen
→ Pool loaded → SSE connected → Agents bắt đầu thảo luận
```

#### Tình huống 2: User bỏ chọn một số agents
```
MindX suggest 4 agents: ☑A ☑B ☑C ☑D
→ User click bỏ chọn B, D → ☑A ☐B ☑C ☐D
→ handleToggleAgent(btnId, 'B') → agent B: checked=false
→ Click "Bắt đầu Meeting"
→ checkedAgentIds = [A.id, C.id]  (chỉ 2 agents)
→ POST /api/pool/create { agentIds: [A.id, C.id] }
→ Pool chỉ có 2 agents: A và C
→ Meeting diễn ra với 2 agents
```

#### Tình huống 3: User bỏ chọn TẤT CẢ agents
```
User uncheck tất cả → ☐A ☐B ☐C ☐D
→ Click "Bắt đầu Meeting"
→ checkedAgentIds.length === 0
→ Hiện warning bot message: "⚠️ Hãy chọn ít nhất 1 agent..."
→ Button giữ nguyên "🚀 Bắt đầu Meeting" (KHÔNG loading, KHÔNG tạo pool)
→ User có thể re-check agents và thử lại
```

#### Tình huống 4: API lỗi khi tạo pool
```
Click "Bắt đầu Meeting" → Button: "⏳ Đang tạo Meeting..."
→ POST /api/pool/create → Server trả 500 (hoặc network error)
→ catch: Hiện error bot message "⚠️ Không thể tạo meeting. Vui lòng thử lại!"
→ finally: setCreatingPool(null) → Button reset về "🚀 Bắt đầu Meeting"
→ User có thể try lại → click sẽ tạo pool mới
```

#### Tình huống 5: Double-click nhanh (Race condition)
```
Click lần 1 → setCreatingPool(btnId) → bắt đầu API call
→ Click lần 2 (ngay lập tức)
→ if (creatingPool) return  → BLOCK lần click thứ 2
→ Button đã disabled=true + cursor-not-allowed → UI cũng ngăn
→ Chỉ 1 pool được tạo
```

#### Tình huống 6: Tạo nhiều meetings trong cùng conversation
```
User chat topic 1 → MindX suggest agents (btnId: start-btn-conv1-1710000001)
→ Click "Bắt đầu" → Pool 1 created → bot-created card

User chat topic 2 → MindX suggest agents (btnId: start-btn-conv1-1710000099)
→ btnId KHÁC nhau (nhờ Date.now()) → hoàn toàn độc lập
→ Click "Bắt đầu" → Pool 2 created → bot-created card thứ 2

Sidebar: Conversation hiện 2 meeting chips: [Pool 1] [Pool 2]
→ Click chip nào → vào meeting room tương ứng
```

#### Tình huống 7: Reload page sau khi tạo meeting
```
Scenario A: linkMeeting THÀNH CÔNG trước reload
→ Reload → getConversation()
→ Message type = 'bot-created' (đã persist)
→ UI hiện "✓ Created" card với button "→ Vào Meeting Room"
→ Click → navigateToMeeting(meetingId) → vào meeting room

Scenario B: linkMeeting THẤT BẠI trước reload
→ Reload → getConversation()
→ Message type = 'bot-agents' (chưa persist)
→ UI hiện lại "🚀 Bắt đầu Meeting" button
→ User click → tạo pool MỚI (duplicate pool)
→ MVP risk: thấp. Future fix: dedup bằng conversationId+btnId
```

### Props Threading — Luồng truyền data qua components

```
SetupScreen (L245-329)
  │
  ├─ creatingPool: string | null  ← state: btnId đang loading
  ├─ handleStartMeeting(btnId)    ← gọi api.createPool()
  │
  └─ <MessageBubble
        message={msg}
        onStartMeeting={handleStartMeeting}  ← truyền btnId (không phải meetingId)
        onGoToMeeting={(id) => navigateToMeeting(id)}
        onToggleAgent={handleToggleAgent}
        meetingCreated={msg.type === 'bot-created'}  ← check type thay vì Set
        isLoading={creatingPool === msg.btnId}        ← so sánh btnId
      />
      │
      └── MessageBubble (L42-161)
            │
            ├─ type 'bot-agents' → render AgentSuggestion
            │   └── <AgentSuggestion
            │         agents={message.agents}
            │         meetingCreated={meetingCreated}
            │         isLoading={isLoading}                ← threading từ trên
            │         onStart={() => onStartMeeting(btnId)} ← gửi btnId lên
            │         onToggle={(agentId) => ... }
            │         onGoto={() => onGoToMeeting(meetingId)}
            │       />
            │       │
            │       └── AgentSuggestion (L21-87)
            │             ├─ meetingCreated ? "→ Vào Meeting" : "🚀 Bắt đầu"
            │             └─ isLoading ? disabled + "⏳ Đang tạo..." : enabled
            │
            └─ type 'bot-created' → render Created card
                ├─ ✓ CREATED badge
                ├─ 🧠 meetingTitle
                ├─ agentBadges chips
                └─ "→ Vào Meeting Room" button
```

### Message State Transitions

```
ConversationMessage.type progression:

  'bot'          → Tin nhắn thường từ MindX (chat, greeting, error)
       │
  'bot-agents'   → MindX gợi ý agents (có agents[], btnId, intro)
       │              - User có thể toggle agents
       │              - Button "🚀 Bắt đầu Meeting" hiện
       │
       ↓ [User clicks "Bắt đầu Meeting"]
       ↓ [api.createPool() thành công]
       │
  'bot-created'  → Meeting đã được tạo (có meetingId, meetingTitle, agentBadges)
                    - Button "→ Vào Meeting Room" hiện
                    - Agent cards biến mất, thay bằng badge chips
                    - Transition xảy ra 2 nơi:
                      ① Local state (ngay lập tức) — SetupScreen L290-303
                      ② Server persist (fire-and-forget) — PATCH link-meeting
```

---

## 🔍 Root Cause Analysis

### Current Flow (Broken)
```
User clicks "Bắt đầu Meeting"
    ↓
AgentSuggestion.onStart() → SetupScreen.handleStartMeeting(meetingId)
    ↓
meetingId = message.meetingId || ''  ← ALWAYS EMPTY (never set by server)
    ↓
navigateToMeeting('')  → MeetingScreen with empty ID
    ↓
useMeeting(null) → api.getPool('') → 404 → AGENTS · 0, empty feed
```

### Expected Flow (from docs/idea.md + plans/00-phase-1-mvp.md line 254)
```
User clicks "Bắt đầu Meeting"
    ↓
Frontend: POST /api/pool/create { topic, agentIds, conversationId }
    ↓
Server: create Pool + MindX announcement + select opening agent + enqueue meeting loop
    ↓
Server: return pool with _id
    ↓
Frontend: store meetingId on conversation message → update to "bot-created" card
    ↓
Frontend: navigate to MeetingScreen(poolId)
    ↓
MeetingScreen: useMeeting(poolId) → load agents + SSE → agents discuss
```

### What's Already Built (Backend) — Verified by Code Review
| Component | Status | File | Verification Note |
|---|---|---|---|
| `POST /api/pool/create` | ✅ Working | `routes/pool.ts` L12-53 | Creates pool, MindX announce, select opener, enqueue worker |
| `poolService.createPool()` | ✅ Working | `services/pool.service.ts` | Returns `Pool` with `_id`, `title`, `agents: AgentRef[]` |
| `mindxService.generateAnnouncement()` | ✅ Working | `services/mindx.service.ts` | Sync call before loop starts |
| `mindxService.selectOpeningAgent()` | ✅ Working | `services/mindx.service.ts` | Picks best agent based on topic |
| `handleMeetingLoop()` | ✅ Working | `services/mindx.service.ts` | Full meeting loop with relevance check |
| `QueueManager` | ✅ Working | `queue/QueueManager.ts` | FIFO, max depth, duplicate prevention |
| SSE streaming | ✅ Working | `routes/stream.ts` | Handles all event types from `events.ts` |
| Worker BLPOP loop | ✅ Working | `worker.ts` | Picks up jobs from Redis meeting queue |
| `api.createPool()` (frontend) | ✅ Exists but NOT called | `lib/api.ts` L83-87 | Function ready, just not wired |
| Shared types: `Pool`, `AgentRef` | ✅ Ready | `packages/shared/src/types/pool.ts` | `Pool._id`, `.title`, `.agents` all available |
| Shared types: `ConversationMessage` | ✅ Ready | `packages/shared/src/types/conversation.ts` | Has `meetingId?`, `meetingTitle?`, `agentBadges?` |

### What's Missing (Frontend wiring + 1 server fix)
| Gap | File | Action |
|---|---|---|
| "Bắt đầu Meeting" doesn't call `api.createPool()` | `SetupScreen.tsx` L245-248 | Call API, get poolId |
| No topic available at click time | `SetupScreen.tsx` | Extract from preceding user message |
| `meetingId` never stored on conversation message | `SetupScreen.tsx` | Update message after pool creation |
| No `bot-created` card transition | `SetupScreen.tsx` | Transform `bot-agents` → `bot-created` |
| Server doesn't persist `meetingId` on conversation | `conversations.ts` | New PATCH endpoint |
| No loading state on "Bắt đầu Meeting" button | `AgentSuggestion.tsx` | Add `isLoading` prop |
| Sidebar meeting chips not linked (hardcoded `[]`) | `App.tsx` L76 | Cross-reference pools by `conversationId` |
| ⚠️ **`btnId` NOT unique across multiple blocks** | `conversations.ts` L302 | Fix: append counter/timestamp to `btnId` |

---

## 📋 Implementation Steps

### Step 0: Fix `btnId` Uniqueness (Server-side Prerequisite)

**File:** `apps/server/src/routes/conversations.ts` (line 302)

> ⚠️ **Bug found during code review:** Server currently generates `btnId: \`start-btn-${conversation._id}\``
> which is the SAME for every `bot-agents` message in the same conversation.
> If a user creates multiple agent suggestion blocks (e.g. "thêm 1 meeting khác về pricing strategy"),
> they would all share the same btnId → `handleToggleAgent` and pool creation would target the wrong block.

```diff
  (conversation.messages as unknown as Array<Record<string, unknown>>).push({
    type: 'bot-agents',
    time: replyTime,
    intro: cleanContent,
    agents: results,
    thinking: thinkingContent,
-   btnId: `start-btn-${conversation._id}`,
+   btnId: `start-btn-${conversation._id}-${Date.now()}`,
  });
```

**Why `Date.now()`:** Each LLM response is sequential (never parallel for the same conversation), so timestamps are guaranteed unique within a conversation. Simpler than UUID and still human-readable in debugging.

---

### Step 1: Wire "Bắt đầu Meeting" → Pool Creation (Core Fix)

**File:** `apps/web/src/screens/SetupScreen.tsx`

Replace the current `handleStartMeeting` with pool creation logic. The current function signature `handleStartMeeting(meetingId: string)` will change to `handleStartMeeting(btnId: string)` since `btnId` is the identifier we use to find the agent suggestion block.

```typescript
const [creatingPool, setCreatingPool] = useState<string | null>(null); // btnId of pool being created

const handleStartMeeting = async (btnId: string) => {
  if (creatingPool) return; // Prevent double-click

  // 1. Find the bot-agents message by btnId
  const agentMsg = messages.find(
    (m) => m.type === 'bot-agents' && m.btnId === btnId
  );
  if (!agentMsg?.agents) return;

  // 2. Get checked agent IDs
  const checkedAgentIds = agentMsg.agents
    .filter((a) => a.checked)
    .map((a) => a.agentId || a.id || '')
    .filter(Boolean);

  if (checkedAgentIds.length === 0) {
    // TODO: Show toast "Hãy chọn ít nhất 1 agent"
    return;
  }

  // 3. Determine topic: find the user message immediately before this suggestion
  const msgIndex = messages.indexOf(agentMsg);
  let topic = '';
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (messages[i].type === 'user' && messages[i].content) {
      topic = messages[i].content!;
      break;
    }
  }
  if (!topic) topic = 'Discussion';

  // 4. Create pool
  setCreatingPool(btnId);
  try {
    const pool = await api.createPool(topic, checkedAgentIds, currentConversationId || '');

    // 5. Update the message locally: bot-agents → bot-created
    setMessages((prev) =>
      prev.map((m) =>
        m.btnId === btnId
          ? {
              ...m,
              type: 'bot-created' as const,
              meetingId: pool._id,
              meetingTitle: pool.title,
              agentBadges: pool.agents?.map((a) => `${a.icon} ${a.name}`) || [],
            }
          : m
      )
    );

    // 6. Persist to server (fire-and-forget — don't block navigation)
    if (currentConversationId) {
      api.linkMeetingToConversation(currentConversationId, btnId, pool._id, pool.title)
        .catch((err) => console.error('Failed to link meeting:', err));
    }

    // 7. Invalidate caches and navigate
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['pools'] });
    setTimeout(() => navigateToMeeting(pool._id), 600);
  } catch (err) {
    console.error('Failed to create pool:', err);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'bot' as const,
        time: makeTime(),
        content: '⚠️ Không thể tạo meeting. Vui lòng thử lại!',
      },
    ]);
  } finally {
    setCreatingPool(null);
  }
};
```

**Also:** Remove `createdMeetings` state (now unused):
```diff
- const [createdMeetings, setCreatedMeetings] = useState<Set<string>>(new Set());
+ const [creatingPool, setCreatingPool] = useState<string | null>(null);
```

### Step 2: Pass `btnId` Instead of `meetingId` for Start Action

**File:** `apps/web/src/components/chat/MessageBubble.tsx` (line 105)

```diff
- onStart={() => onStartMeeting?.(message.meetingId || '')}
+ onStart={() => onStartMeeting?.(message.btnId || '')}
```

**File:** `apps/web/src/screens/SetupScreen.tsx` (line 311, 314)

Pass `creatingPool` to determine `meetingCreated` state:
```diff
  <MessageBubble
    message={msg}
    onStartMeeting={handleStartMeeting}
    onGoToMeeting={(id) => navigateToMeeting(id)}
    onToggleAgent={handleToggleAgent}
-   meetingCreated={msg.meetingId ? createdMeetings.has(msg.meetingId) : false}
+   meetingCreated={msg.type === 'bot-created'}
  />
```

### Step 3: Add Loading State to "Bắt đầu Meeting" Button

**File:** `apps/web/src/components/chat/AgentSuggestion.tsx`

Add `isLoading` prop:
```diff
  interface AgentSuggestionProps {
    agents: Agent[];
-   meetingId: string;
    meetingCreated?: boolean;
+   isLoading?: boolean;
    onToggle: (agentId: string) => void;
    onStart: () => void;
    onGoto: () => void;
  }
```

Update button to show loading state:
```diff
  <button
    onClick={onStart}
+   disabled={isLoading}
    className="mt-4 w-full py-4 px-6 bg-gradient-to-br from-accent to-[#2de8a8] ..."
  >
-   🚀 Bắt đầu Meeting
+   {isLoading ? '⏳ Đang tạo Meeting...' : '🚀 Bắt đầu Meeting'}
  </button>
```

**File:** `apps/web/src/components/chat/MessageBubble.tsx` (line 100-107)

Pass `isLoading` down:
```diff
  <AgentSuggestion
    agents={message.agents || []}
-   meetingId={message.meetingId || ''}
    meetingCreated={meetingCreated}
+   isLoading={/* passed from parent */}
    onToggle={...}
    onStart={...}
    onGoto={...}
  />
```

This requires adding `isLoading` to `MessageBubble` props and threading through from `SetupScreen → MessageBubble → AgentSuggestion`.

### Step 4: New API Endpoint — Link Meeting to Conversation

**File:** `apps/server/src/routes/conversations.ts`

Add endpoint to persist `meetingId` on conversation:

```typescript
// PATCH /conversations/:id/link-meeting
router.patch('/:id/link-meeting', async (req, res, next) => {
  try {
    const { btnId, meetingId, meetingTitle } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }

    const messages = conversation.messages as unknown as Array<Record<string, unknown>>;
    const msgIndex = messages.findIndex((m) => m.btnId === btnId);
    if (msgIndex >= 0) {
      messages[msgIndex].type = 'bot-created';
      messages[msgIndex].meetingId = meetingId;
      messages[msgIndex].meetingTitle = meetingTitle;
      messages[msgIndex].agentBadges = (messages[msgIndex].agents as Array<{ icon: string; name: string }>)
        ?.map((a) => `${a.icon} ${a.name}`) || [];
    }

    await conversation.save();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
```

**Note:** This route is already under `conversationsRouter` which mounts at `/conversations`, so the path is `PATCH /api/conversations/:id/link-meeting`.

**File:** `apps/web/src/lib/api.ts`

```typescript
linkMeetingToConversation: (conversationId: string, btnId: string, meetingId: string, meetingTitle: string) =>
  request<{ ok: boolean }>(`/conversations/${conversationId}/link-meeting`, {
    method: 'PATCH',
    body: JSON.stringify({ btnId, meetingId, meetingTitle }),
  }),
```

### Step 5: Wire Sidebar Meeting Chips (Bonus)

**File:** `apps/web/src/App.tsx` (line 72-77)

Currently `meetings: []` is hardcoded. Cross-reference pools by `conversationId`:

```diff
  conversations={conversations.map((c) => ({
    _id: c._id,
    title: c.title,
    sub: c.sub || '',
-   meetings: [],
+   meetings: pools
+     .filter((p) => p.conversationId === c._id)
+     .map((p) => ({
+       _id: p._id,
+       title: p.title,
+       status: p.status,
+       agents: p.agents || [],
+     })),
  }))}
```

This enables the meeting chip inside each conversation in the Sidebar → clicking it navigates directly to the meeting.

---

## 📐 Data Flow After Fix

```
[User clicks "Bắt đầu Meeting"]
    ↓
SetupScreen.handleStartMeeting(btnId)
    ↓ find bot-agents message by btnId
    ↓ extract checked agentIds + topic from preceding user message
    ↓
POST /api/pool/create { topic, agentIds, conversationId }
    ↓ Server: create Pool + MindX announce + select opener + enqueue worker
    ↓ Returns: pool { _id, title, agents, ... }
    ↓
Frontend: update message bot-agents → bot-created { meetingId, meetingTitle, agentBadges }
    ↓
PATCH /api/conversations/:id/link-meeting { btnId, meetingId, meetingTitle }
    ↓ Server: persist meetingId on conversation message (fire-and-forget)
    ↓
navigateToMeeting(pool._id) after 600ms
    ↓
MeetingScreen → useMeeting(poolId) → api.getPool(poolId)
    ↓ Pool loaded with agents, status='active'
    ↓
useSSE(poolId) → EventSource /api/stream/:poolId
    ↓ Worker (BLPOP) picks up job → handleMeetingLoop()
    ↓ Receives: mindx_announce → agent_typing → agent_chunk → agent_message → queue_update
    ↓
AgentsPanel shows agents with live states
DiscussionFeed shows real-time discussion
Sidebar updates: meeting chip appears under conversation
```

---

## 🧪 Verification Plan

### Automated
1. **Typecheck:** `pnpm typecheck` — 0 errors
2. **Server unit tests:** `pnpm --filter @mindpool/server test` — all 15 tests pass (existing: pool.routes, conversations.routes, QueueManager, StopSignalDetector, mindx.service, etc.)
3. **ESLint:** `pnpm --filter @mindpool/web exec eslint src/` + `pnpm --filter @mindpool/server exec eslint src/` — clean

### Manual (requires docker compose up / pnpm dev)
4. Click "Bắt đầu Meeting" → verify button shows "⏳ Đang tạo Meeting..."
5. Verify pool is created: `curl http://localhost:3001/api/pools` returns new pool
6. Verify message transitions to "✓ Created" meeting card with agent badges
7. Verify meeting room shows agents in AgentsPanel with correct states (Speaking/Listening/Queued)
8. Verify MindX announcement appears in DiscussionFeed
9. Verify agents start speaking via SSE stream (check server logs for `Meeting loop enqueued` + worker BLPOP pickup)
10. Go back → re-enter meeting via conversation card "Vào Meeting" → data persists
11. Full page reload → conversation shows "Vào Meeting" card (not "Bắt đầu Meeting")
12. Check Sidebar shows meeting chip under conversation → clicking chip navigates to MeetingScreen
13. **Multi-meeting test:** In same conversation, ask for a second topic → verify second "Bắt đầu Meeting" block has different `btnId` (Step 0 fix)

---

## 📁 Files to Modify

| File | Action | Lines |
|---|---|---|
| `apps/server/src/routes/conversations.ts` | Fix `btnId` uniqueness (Step 0) + Add PATCH link-meeting (Step 4) | ~27 lines |
| `apps/web/src/screens/SetupScreen.tsx` | Rewrite `handleStartMeeting` + remove `createdMeetings` | ~50 lines |
| `apps/web/src/components/chat/MessageBubble.tsx` | Pass `btnId` + `isLoading` prop | ~5 lines |
| `apps/web/src/components/chat/AgentSuggestion.tsx` | Add `isLoading`, remove `meetingId` prop, disable button | ~8 lines |
| `apps/web/src/lib/api.ts` | Add `linkMeetingToConversation` | 5 lines |
| `apps/web/src/App.tsx` | Wire sidebar meeting chips (replace hardcoded `meetings: []`) | ~8 lines |

**Total: ~105 lines changed across 6 files**

---

## ⚠️ Edge Cases

| Case | Handling |
|---|---|
| No agents checked | Show toast, don't create pool |
| API error on pool creation | Show error bot-message, re-enable button |
| User disconnects during creation | Pool already created server-side; on return, conversation shows meeting card |
| Click "Bắt đầu Meeting" twice | `creatingPool` state prevents double-click, button shows loading |
| Conversation not yet created | Cannot happen — conversation always exists before agent suggestions |
| `linkMeeting` API fails | Fire-and-forget — pool + local state already correct; next reload will re-fetch |
| Multiple bot-agents blocks in one conversation | Each has unique `btnId` after Step 0 fix — independent pool creation |
| Reload after pool created but `linkMeeting` failed | Button shows "Bắt đầu" again → user clicks → duplicate pool. MVP risk: low. Future: dedup on server by `conversationId + btnId` |

---

## 👥 Expert Review (5 Personas)

### 1. 🏗️ Frontend Architect — "Cấu trúc & State Management"
**Verdict:** ✅ Thiết kế hợp lý

- **State flow rõ ràng:** `creatingPool` state dùng `btnId` để track button nào đang loading — tốt hơn dùng boolean vì hỗ trợ multiple bot-agents blocks.
- **`createdMeetings` Set được thay bằng kiểm tra `msg.type === 'bot-created'`** — đơn giản hơn, stateless hơn.
- **Fire-and-forget `linkMeeting`** là quyết định đúng — không cần block navigation cho một API call phụ trợ persistence.
- **Props threading `SetupScreen → MessageBubble → AgentSuggestion`** là cần thiết nhưng hơi dài — ok cho scope này, future có thể dùng context.

### 2. 🔧 Backend Engineer — "API & Data Integrity"
**Verdict:** ✅ Đầy đủ, một lưu ý nhỏ

- **PATCH endpoint:** Đúng cách dùng PATCH cho partial update — `btnId` là unique identifier tốt.
- **Mongoose `conversation.save()`** sẽ trigger `updatedAt` — tốt, giúp Sidebar sort conversations mới nhất.
- **`_id: false`** trên `ConversationMessageSchema` (L29) — nghĩa là messages KHÔNG có `_id` subdocument. Vậy dùng `btnId` để tìm message là approach đúng (không thể dùng `_id`).
- **Lưu ý:** Validate `btnId`, `meetingId` body params ở PATCH endpoint — nên thêm `z.object({ btnId: z.string(), meetingId: z.string(), meetingTitle: z.string() })` schema validation tương tự các route khác.

### 3. 🎨 UX Designer — "User Experience"
**Verdict:** ✅ Tốt, có suggestion

- **Loading state** trên button "⏳ Đang tạo Meeting..." rất quan trọng — pool creation liên quan LLM call (announcement, opening agent) nên có thể mất 3-10 giây.
- **Error message** dùng bot message thay vì alert/toast — UI consistent với chat pattern.
- **Transition** `bot-agents → bot-created` nên có animation — Framer Motion `AnimatePresence` có thể wrap.
- **Suggestion:** Sau khi pool tạo thành công, disable agent checkboxes trên `bot-created` card — user không nên thay đổi agents đã chọn.

### 4. 🔒 Security & Reliability — "Fault tolerance"
**Verdict:** ✅ Chấp nhận được cho MVP

- **Double-click prevention** bằng `creatingPool` state — ok cho single user.
- **Fire-and-forget `linkMeeting`** — nếu fail, conversation sẽ vẫn có `bot-agents` type thay vì `bot-created`. Khi reload, button "Bắt đầu Meeting" sẽ hiện lại nhưng pool đã tồn tại → user click lại sẽ tạo duplicate pool. **Mitigation:** Backend `pool/create` route có thể check `conversationId + topic` unique — nhưng cho MVP, risk thấp.
- **Validation** trên PATCH endpoint nên kiểm tra `meetingId` refer tới pool thực trong DB (tránh tamper). Cho MVP ok bỏ qua.

### 5. 📊 Integration Tester — "End-to-End Flow"
**Verdict:** ✅ Plan coverage đầy đủ

- **Happy path:** User chat → agents suggested → click "Bắt đầu" → pool created → navigate → agents discuss ✅
- **Reload path:** Load conversation with existing `bot-created` → "Vào Meeting" → MeetingScreen ✅
- **Sidebar path:** Click conversation → meeting chip appears → click chip → MeetingScreen ✅ (Step 5 covers this)
- **History path:** HistoryScreen → list pools → click → MeetingScreen ✅ (already working, uses `api.getPools()`)
- **Edge case:** Multiple meetings per conversation → each `btnId` is unique (after Step 0 fix) → ✅
- **Missing test:** Cần verify worker BLPOP picks up job immediately after `redis.rpush()`. Có thể cần restart worker nếu bị stuck. **Suggestion:** Add log check trong verification plan.

---

## 📝 Code Review Notes (2026-03-13)

> Findings from deep codebase research prior to implementation.

### Verified Working Components
- **Pool route** (`routes/pool.ts` L12-53): Creates pool → MindX announcement → select opening agent → enqueue worker → returns 201 with full pool data. Has rollback on failure.
- **SSE hook** (`useSSE.ts`): Handles all event types: `mindx_announce`, `agent_typing`, `agent_chunk`, `agent_message`, `agent_done`, `queue_update`, `agent_state`, `pool_complete`. Reconnects on error with 3s delay.
- **Meeting store** (`meetingStore.ts`): Properly handles typing → agent message transition (inherits thinking data, removes typing indicator). Has `appendChunk` for real-time streaming.
- **AgentsPanel** (`AgentsPanel.tsx`): Merges SSE agent states with pool data. 4 visual states: moderating, speaking, queued, listening. Speaking wave animation working.
- **DiscussionFeed** (`DiscussionFeed.tsx`): Renders agent, user, mindx, and typing messages. ThinkingBlock with expand/collapse. Auto-scroll on new messages.

### Key Type References
- `Pool._id: string` — needed for `navigateToMeeting(pool._id)`
- `Pool.title: string` — for meeting card title
- `Pool.agents: AgentRef[]` — `AgentRef { agentId, icon, name, role, state }`
- `Pool.conversationId: string` — for sidebar meeting chips cross-reference
- `ConversationMessage.btnId?: string` — identifier for agent suggestion blocks
- `ConversationMessage.meetingId?: string` — set after pool creation
