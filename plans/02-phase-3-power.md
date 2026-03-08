# ⚡ Phase 3 — Power Features

> **Source:** [idea.md](../docs/idea.md) · [prototype.html](../docs/prototype.html)
> **Mục tiêu:** Chuyển Mindpool từ sản phẩm cá nhân → nền tảng mở — custom agents, RAG, marketplace, sharing, auth, mobile, integrations, multi-provider LLM.
> **Prerequisite:** Phase 2 ổn định — mindmap, recap, 5/5 stop signals, advanced MindX đều hoạt động đúng.

---

## 📋 Scope

### ✅ Bao gồm
- [ ] **Authentication** — Google OAuth + email/password, JWT, multi-user data isolation
- [ ] **Custom Agent Builder** — UI tạo agent với persona, personality sliders, system prompt preview
- [ ] **RAG cho Custom Agents** — upload documents (PDF/TXT/MD), vectorize, retrieve khi agent phát biểu
- [ ] **Agent Marketplace** — browse, clone, submit agent templates, category filter, rating
- [ ] **Timeline View** — replay meeting theo trục thời gian, agent activity bars
- [ ] **Share Pool** — public read-only link, token-based, expire options
- [ ] **Mobile Responsive** — sidebar → bottom nav, meeting room single-column, touch-friendly mindmap
- [ ] **Integrations** — Notion export, Jira issue creation từ action items
- [ ] **LLM Providers mở rộng** — OpenAI, Gemini, DeepSeek implement LLMProvider interface
- [ ] **Multi-language support** — i18n framework (Vietnamese default, English)
- [ ] **Pool Templates** — template pools cho use cases phổ biến (Startup Idea, Architecture Review, Hiring...)
- [ ] **Notification system** — in-app notifications cho recap ready, shared pool viewed, etc.

### ❌ Không bao gồm (Phase 4+)
- Voice input / Speech-to-text
- Real-time collaboration (multi-user same pool)
- Billing / Subscription system
- Self-hosted / On-premise deployment
- Plugin SDK / Extension API
- Advanced analytics dashboard
- Webhook integrations
- White-label / Custom branding

---

## 📁 Folder Structure Changes (so với Phase 2)

```diff
  apps/web/src/
+     ├── components/auth/          # LoginForm, RegisterForm, AuthProvider, ProtectedRoute
+     ├── components/agent-builder/ # AgentBuilderForm, PersonalitySliders, SystemPromptPreview
+     ├── components/marketplace/   # MarketplaceGrid, AgentTemplateCard, RatingStars, CategoryFilter
+     ├── components/share/         # ShareDialog, SharedPoolView
+     ├── components/timeline/      # TimelineView, TimelineBar, TimelineSegment
+     ├── components/notification/  # NotificationBell, NotificationPanel
      ├── screens/
+     │   ├── LoginScreen.ts
+     │   ├── RegisterScreen.ts
+     │   ├── AgentBuilderScreen.ts
+     │   ├── MarketplaceScreen.ts
+     │   └── SharedPoolScreen.ts   # Public page, no auth required
      ├── stores/
+     │   ├── authStore.ts
+     │   └── notificationStore.ts
+     └── i18n/
+         ├── vi.json                # Vietnamese translations
+         └── en.json                # English translations

  apps/server/src/
+     ├── auth/
+     │   ├── auth.controller.ts     # Login, register, refresh token
+     │   ├── auth.service.ts        # JWT, Google OAuth, password hashing
+     │   ├── auth.middleware.ts     # JWT verification middleware
+     │   └── auth.guard.ts         # Route protection
+     ├── services/
+     │   ├── agent-builder.service.ts
+     │   ├── rag.service.ts         # Document processing + retrieval
+     │   ├── marketplace.service.ts
+     │   ├── share.service.ts
+     │   └── notification.service.ts
+     ├── models/
+     │   ├── User.ts
+     │   ├── AgentTemplate.ts       # Marketplace templates
+     │   ├── ShareToken.ts
+     │   ├── Document.ts            # RAG uploaded docs
+     │   └── Notification.ts
      └── llm/providers/
+         ├── openai.ts
+         ├── gemini.ts
+         └── deepseek.ts

  packages/shared/types/
+     ├── auth.ts                    # User, AuthToken types
+     ├── marketplace.ts             # AgentTemplate, Rating types
+     └── share.ts                   # ShareToken, SharedPool types

  e2e/tests/
+     ├── auth.spec.ts
+     ├── agent-builder.spec.ts
+     ├── marketplace.spec.ts
+     ├── share-pool.spec.ts
+     └── mobile.spec.ts             # Responsive viewport tests
```

---

## 🏗️ Technical Tasks

### 1. Authentication

#### 1.1 Why Auth Now?
Phase 1-2 chạy single-user mode. Phase 3 cần auth vì:
- Custom agents là tài sản cá nhân → cần user ownership
- Marketplace cần author identity
- Share pool cần biết ai created
- Multi-device sync cần account

#### 1.2 Auth Architecture
```
┌─────────┐    ┌────────────┐    ┌──────────┐
│ Browser  │───►│ Express    │───►│ MongoDB  │
│          │    │ Server     │    │          │
│ JWT in   │    │            │    │ User     │
│ cookie   │    │ auth.mid   │    │ Session  │
│ (httpOnly│    │ ↓          │    │          │
│ secure)  │    │ verify JWT │    │          │
└─────────┘    └────────────┘    └──────────┘
                     │
                     ▼
              ┌──────────────┐
              │ Google OAuth │
              │ (passport.js)│
              └──────────────┘
```

#### 1.3 Data Model (`packages/shared/types/auth.ts`)
```typescript
interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;           // URL hoặc gradient seed
  initials: string;          // "DT" — tính từ name
  authProvider: 'local' | 'google';
  passwordHash?: string;     // Chỉ khi local auth
  googleId?: string;
  settingsId: string;        // Reference đến Settings document
  createdAt: Date;
  lastLoginAt: Date;
}

interface AuthTokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
```

#### 1.4 Backend Tasks
- [ ] `passport.js` + `passport-google-oauth20` cho Google OAuth
- [ ] `bcrypt` cho password hashing (local auth)
- [ ] `jsonwebtoken` cho JWT generation + verification
- [ ] API endpoints:
  | Method | Endpoint | Description |
  |---|---|---|
  | POST | `/api/auth/register` | Email/password registration |
  | POST | `/api/auth/login` | Email/password login → JWT |
  | GET | `/api/auth/google` | Redirect to Google OAuth |
  | GET | `/api/auth/google/callback` | Handle OAuth callback → JWT |
  | POST | `/api/auth/refresh` | Refresh expired token |
  | POST | `/api/auth/logout` | Invalidate token |
  | GET | `/api/auth/me` | Get current user profile |
  | PUT | `/api/auth/profile` | Update name, avatar |
- [ ] `auth.middleware.ts` — extract JWT from cookie → verify → attach `req.user`
- [ ] **Migration**: tất cả existing data từ Phase 1-2 gán cho `defaultUser` → khi user đầu tiên register, claim data đó

#### 1.5 Frontend Tasks
- [ ] `LoginScreen` — email/password form + "Sign in with Google" button
- [ ] `RegisterScreen` — email + password + name form
- [ ] `AuthProvider` context — wrap entire app, manage JWT state
- [ ] `ProtectedRoute` component — redirect to login nếu chưa auth
- [ ] `authStore` (Zustand) — user, token, isAuthenticated, login(), logout()
- [ ] Profile section trong Settings: edit name, change avatar, change password
- [ ] Sidebar header: user avatar + name (replace static "DT")

#### 1.6 Data Isolation
- [ ] Tất cả queries thêm `userId` filter: Pools, Conversations, Agents (custom), Settings
- [ ] Built-in agents (isCustom: false) → shared across all users
- [ ] Custom agents → scoped to creator userId

---

### 2. Custom Agent Builder

#### 2.1 UX Flow (idea.md L633-638)
```
User nhấn "+" Create Agent
      ↓
┌─────────────────────────────────────────────┐
│  🛠️ Create Custom Agent                     │
│                                              │
│  Name: [Senior Dev tại UrBox        ]       │
│  Icon: [emoji picker — 👨‍💻]                 │
│  Specialty: [NestJS, microservices, DDD]    │
│                                              │
│  ── Personality ──────────────────────       │
│  Directness:  [━━━━━━━●━━━] 70%            │
│  Creativity:  [━━━━●━━━━━━] 50%            │
│  Skepticism:  [━━━━━━━━●━━] 80%            │
│                                              │
│  ── System Prompt Preview ────────────       │
│  ┌────────────────────────────────────┐     │
│  │ You are a Senior Developer at     │     │
│  │ UrBox with 8+ years of experience│     │
│  │ in NestJS and microservices...    │     │
│  │ Your directness is high (70%),    │     │
│  │ you speak bluntly...              │     │
│  └────────────────────────────────────┘     │
│                                              │
│  ── Documents (RAG) ─────────────────       │
│  [📎 Upload documents]                       │
│  📄 internal-architecture.md  (2.3 MB)      │
│  📄 coding-standards.pdf      (1.1 MB)      │
│                                              │
│  [💾 Save Agent]  [Preview in Pool →]       │
└─────────────────────────────────────────────┘
```

#### 2.2 Data Model
```typescript
interface CustomAgent extends Agent {
  isCustom: true;
  userId: string;               // Owner
  personality: {
    directness: number;         // 0-100
    creativity: number;         // 0-100
    skepticism: number;         // 0-100
  };
  generatedSystemPrompt: string; // Auto-generated từ personality + specialty
  customSystemPrompt?: string;   // Override thủ công (nếu user muốn fine-tune)
  ragDocuments: DocumentRef[];   // References đến uploaded documents
  isPublished: boolean;          // true nếu đã submit lên marketplace
  templateId?: string;           // Nếu cloned từ marketplace template
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.3 System Prompt Generation
- [ ] `agent-builder.service.ts`:
  - Input: name, icon, specialty, personality sliders, (optional) RAG context
  - Template prompt:
    ```
    You are {name}, an expert in {specialty}.
    
    PERSONALITY TRAITS:
    - Directness: {directness}% — {directness > 70 ? "You speak bluntly and get to the point" : "You are diplomatic and soften your messages"}
    - Creativity: {creativity}% — {creativity > 70 ? "You often suggest unconventional approaches" : "You prefer proven, practical solutions"}
    - Skepticism: {skepticism}% — {skepticism > 70 ? "You question assumptions and look for flaws" : "You are generally supportive and constructive"}
    
    SIGNATURE QUESTION: {auto-generated based on specialty}
    
    RULES:
    - Never break character
    - Base your responses on your expertise in {specialty}
    - {RAG context instructions if documents uploaded}
    ```
  - Live preview: mỗi khi user thay đổi slider → re-generate preview (debounced 300ms)

#### 2.4 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agents/custom` | Tạo custom agent |
| PUT | `/api/agents/custom/:id` | Update agent |
| DELETE | `/api/agents/custom/:id` | Delete agent |
| GET | `/api/agents/custom` | List user's custom agents |
| POST | `/api/agents/custom/:id/preview` | Generate system prompt preview |
| POST | `/api/agents/custom/:id/documents` | Upload RAG document |
| DELETE | `/api/agents/custom/:id/documents/:docId` | Remove document |

#### 2.5 Frontend Tasks
- [ ] `AgentBuilderScreen` — full-page form
- [ ] `PersonalitySliders` — 3 range inputs với live labels
- [ ] `SystemPromptPreview` — auto-refresh text area (read-only, monospace)
- [ ] `EmojiPicker` — grid of common emojis + search
- [ ] `DocumentUpload` — drag-and-drop zone + file list
- [ ] Custom agents hiển thị trong:
  - MindX agent suggestions (khi topic match specialty)
  - Agent library modal (khi user muốn browse/add thủ công)
  - Settings → "My Agents" tab

---

### 3. RAG cho Custom Agents

#### 3.1 RAG Pipeline
```
User upload document
      ↓
[Parse] — PDF → text (pdf-parse), TXT/MD → raw text
      ↓
[Chunk] — Split thành chunks 500-1000 tokens (overlap 100 tokens)
      ↓
[Embed] — Gọi embedding API (Kimi hoặc MiniMax)
      ↓  
[Store] — Lưu vectors vào MongoDB (embedding field trong DocumentChunk collection)
      ↓
      ────────────────────────────────────
      Khi agent cần phát biểu:
      ↓
[Query] — Embed câu hỏi/context hiện tại
      ↓
[Retrieve] — Top-K nearest vectors (k=5, cosine similarity)
      ↓
[Inject] — Append relevant chunks vào agent's system prompt
      ↓
[Generate] — Agent phát biểu với augmented context
```

#### 3.2 Data Model
```typescript
interface RagDocument {
  _id: string;
  agentId: string;
  userId: string;
  filename: string;
  originalSize: number;       // bytes
  mimeType: 'application/pdf' | 'text/plain' | 'text/markdown';
  chunkCount: number;
  status: 'processing' | 'ready' | 'error';
  uploadedAt: Date;
}

interface DocumentChunk {
  _id: string;
  documentId: string;
  agentId: string;
  text: string;               // Raw chunk text
  embedding: number[];        // Vector (dimension depends on model)
  chunkIndex: number;
  tokenCount: number;
}
```

#### 3.3 Backend Tasks
- [ ] `rag.service.ts`:
  - `processDocument(file)` — parse + chunk + embed + store
  - `retrieveContext(agentId, query, topK=5)` — vector search → return relevant chunks
  - `injectRAGContext(systemPrompt, chunks)` — append retrieved chunks to prompt
- [ ] Embedding: dùng `LLMRouter.embed()` (thêm method mới vào LLMRouter)
  - Default: MiniMax embedding API (rẻ, nhanh)
  - Fallback: Kimi embedding
- [ ] File upload: `multer` middleware, max 10MB per file, max 5 files per agent
- [ ] MongoDB index trên `documentChunks` collection (compound index: `agentId` + `documentId`)
- [ ] Vector similarity: tính cosine similarity in-app bằng `compute-cosine-similarity` hoặc custom util — load embeddings từ MongoDB, rank top-K, trả về relevant chunks
  - **Lưu ý:** Không dùng Atlas Vector Search (user dùng MongoDB thường). Với scale nhỏ-trung (< 10K chunks/agent), in-app cosine similarity đủ nhanh
  - Nếu scale lên → migrate sang Qdrant self-hosted hoặc Pinecone
- [ ] Background processing: upload → return immediately → process async → SSE notify khi ready

#### 3.4 Giới hạn Phase 3
- Chỉ hỗ trợ: PDF, TXT, MD
- Max 10MB per file, max 5 files per agent
- Không hỗ trợ OCR (scanned PDF)
- Không real-time re-index khi update document (phải re-upload)

---

### 4. Agent Marketplace

#### 4.1 Concept
Marketplace cho phép users browse, clone, và share agent templates. Mỗi template là một "recipe" — không phải live agent, mà là config để tạo custom agent.

#### 4.2 Data Model
```typescript
interface AgentTemplate {
  _id: string;
  authorId: string;
  authorName: string;
  title: string;               // "Startup CTO"
  description: string;         // "Expert in early-stage tech decisions..."
  icon: string;                // "👨‍💻"
  specialty: string;
  personality: { directness: number; creativity: number; skepticism: number };
  systemPromptTemplate: string;
  category: AgentCategory;
  tags: string[];              // ["startup", "tech", "leadership"]
  cloneCount: number;          // Bao nhiêu user đã clone
  rating: { average: number; count: number };
  status: 'pending' | 'approved' | 'rejected'; // QA review
  createdAt: Date;
  updatedAt: Date;
}

type AgentCategory =
  | 'business'     // Strategy, Marketing, Finance
  | 'technology'   // Engineering, DevOps, AI/ML
  | 'design'       // UX, UI, Creative
  | 'legal'        // Compliance, Contracts
  | 'science'      // Research, Data, Analytics
  | 'humanities'   // Ethics, Philosophy, Education
  | 'industry'     // Healthcare, Fintech, E-commerce
  | 'fun';         // Devil's Advocate, Philosopher, Time Traveler
```

#### 4.3 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/marketplace` | Browse templates (paginated, filter by category/tag) |
| GET | `/api/marketplace/:id` | Get template details |
| POST | `/api/marketplace/:id/clone` | Clone template → create custom agent |
| POST | `/api/marketplace/submit` | Submit own agent as template (pending review) |
| POST | `/api/marketplace/:id/rate` | Rate template (1-5 stars) |
| GET | `/api/marketplace/categories` | List all categories |

#### 4.4 Frontend Tasks
- [ ] `MarketplaceScreen`:
  - Header: "Agent Marketplace" + search bar
  - Category pills (scrollable) — filter by category
  - Sort: Popular / Newest / Top Rated
  - Grid of `AgentTemplateCard`s
- [ ] `AgentTemplateCard`:
  - Icon + title + author + rating stars + clone count
  - Description snippet (2 lines)
  - Category badge + tags
  - "Clone" button → tạo custom agent từ template
- [ ] Template detail modal:
  - Full description
  - Personality sliders (read-only preview)
  - System prompt preview
  - Reviews/ratings
  - "Clone to My Agents" CTA
- [ ] "Submit Agent" flow:
  - Từ custom agent → "Publish to Marketplace"
  - Fill: title, description, category, tags
  - Submit → status: pending → admin review (Phase 3: manual, Phase 4: automated)

#### 4.5 Moderation (Simple Phase 3)
- [ ] Submitted templates → `status: pending`
- [ ] Admin API: `PUT /api/admin/marketplace/:id/approve` | `reject`
- [ ] Phase 3: manual review via direct DB / simple admin page
- [ ] Later: automated content review + community reporting

---

### 5. Timeline View

#### 5.1 Design (idea.md L217-230)
```
View tabs: 💬 Chat | 🗺 Mindmap | 🔀 Split | ⏱ Timeline

─────────────────────────────────────────────────────►
0:00    0:30    1:00    1:30    2:00    2:30    3:00

🧠 MindX    ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
📱 Mobile   ░░████░░░░████░░░░░░░░████████░░░░░░░░░
💼 Business ░░░░░░████░░░░████░░░░░░░░░░░░████████░
👤 UX       ░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░░████
🔒 Security ░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░

Legend: ██ Speaking  ░░ Listening  ■■ Queued  ⊘ Dropped
```

#### 5.2 Data Model
```typescript
interface TimelineSegment {
  agentId: string;
  state: 'speaking' | 'queued' | 'listening' | 'dropped';
  startTime: number;     // ms from pool start
  endTime: number;       // ms from pool start
  messageId?: string;    // Link to message if speaking
}
```

#### 5.3 Backend Tasks
- [ ] Track agent state transitions → lưu `TimelineSegment[]` vào Pool document
- [ ] `GET /api/pool/:id/timeline` — return timeline data
- [ ] Tính toán từ existing SSE events: `agent_state` changes → segment boundaries

#### 5.4 Frontend Tasks
- [ ] `TimelineView` component:
  - Horizontal scrollable timeline
  - Y-axis: agent rows (icon + name)
  - X-axis: time (auto-scale to pool duration)
  - Color-coded segments per state
  - Hover segment → tooltip (message preview)
  - Click segment → scroll feed to corresponding message
- [ ] Thêm tab `⏱ Timeline` vào view tabs (bật cho completed pools)
- [ ] Playback controls (optional): Play/Pause + speed (1x/2x/4x) — replay meeting chronologically

---

### 6. Share Pool

#### 6.1 Flow
```
User nhấn "Share" trên meeting/history card
      ↓
┌─────────────────────────────────────────────┐
│  📤 Share Pool                               │
│                                              │
│  🔗 https://mindpool.ai/s/abc123xyz         │
│  [📋 Copy Link]                              │
│                                              │
│  Expires: ○ 7 days  ● 30 days  ○ Never     │
│                                              │
│  Include:                                    │
│  ✅ Discussion feed                          │
│  ✅ Mindmap                                  │
│  ✅ Recap                                    │
│  ⬜ Agent thinking (hidden by default)       │
│                                              │
│  [🗑 Revoke Access]  [✓ Done]               │
└─────────────────────────────────────────────┘
```

#### 6.2 Data Model
```typescript
interface ShareToken {
  _id: string;
  poolId: string;
  userId: string;            // Owner who created the share
  token: string;             // Unique random token (nanoid, 12 chars)
  includeThinking: boolean;  // Whether to show agent thinking
  includeMindmap: boolean;
  includeRecap: boolean;
  expiresAt: Date | null;    // null = never expires
  viewCount: number;
  lastViewedAt: Date | null;
  isRevoked: boolean;
  createdAt: Date;
}
```

#### 6.3 Backend Tasks
- [ ] `POST /api/pool/:id/share` — generate share token
- [ ] `GET /api/shared/:token` — public endpoint (no auth), return pool data based on token permissions
- [ ] `PUT /api/pool/:id/share/:tokenId` — update share settings
- [ ] `DELETE /api/pool/:id/share/:tokenId` — revoke access
- [ ] Rate limiting on public endpoint (prevent scraping)
- [ ] Track view count + last viewed

#### 6.4 Frontend Tasks
- [ ] `ShareDialog` — modal with link, options, copy button
- [ ] `SharedPoolScreen` — public page, separate layout (no sidebar, no auth):
  - Pool title + agent badges + date
  - Discussion feed (read-only, no input)
  - Mindmap (read-only, no interaction) — if included
  - Recap card — if included
  - Thinking blocks — if included, else hidden
  - Footer: "Powered by Mindpool — Create your own →"
- [ ] Share button trên: Meeting topbar + History card context menu

---

### 7. Mobile Responsive

#### 7.1 Breakpoints
```css
/* Desktop (default) */
@media (min-width: 1024px) { /* Current UI */ }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Sidebar: collapsible drawer (hamburger menu) */
  /* Meeting room: agents panel collapse to top bar */
  /* Split view: stack vertically */
}

/* Mobile */
@media (max-width: 767px) {
  /* Sidebar → bottom navigation bar */
  /* Meeting room → single column, tabs for agents/feed/mindmap */
  /* Welcome screen: simplified, single column */
}
```

#### 7.2 Mobile Layout Changes
- [ ] **Sidebar → Bottom Nav Bar**:
  ```
  ┌─────────────────────────────────┐
  │         Main Content             │
  │                                  │
  │                                  │
  ├─────────────────────────────────┤
  │  🏠  💬  📊  ⚙️                │
  │ Home Chat History Settings      │
  └─────────────────────────────────┘
  ```
- [ ] **Meeting Room → Single Column**:
  ```
  ┌─────────────────────────────────┐
  │ ← Mobile App Strategy    ● Live │
  ├─────────────────────────────────┤
  │ [Agents ▾]  ← collapsible      │
  │ 🧠 MindX · 📱 Mobile · 💼 Biz │
  ├─────────────────────────────────┤
  │         Discussion Feed          │
  │         (full width)             │
  │                                  │
  ├─────────────────────────────────┤
  │ 💬 Nhắn tin...           [Gửi] │
  └─────────────────────────────────┘
  ```
- [ ] Tab switching: Agents Panel / Chat Feed / Mindmap (không split trên mobile)
- [ ] Touch-friendly mindmap: pinch zoom, tap nodes, panning
- [ ] Input area: auto-resize với virtual keyboard
- [ ] Welcome screen: single column, stacked feature cards
- [ ] History: list view thay vì grid (more scannable trên mobile)

#### 7.3 Implementation
- [ ] CSS media queries + CSS variables cho responsive tokens
- [ ] `useMediaQuery` hook: `isMobile`, `isTablet`, `isDesktop`
- [ ] Conditional rendering cho complex layout differences
- [ ] Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Touch events: `@xyflow/react` đã hỗ trợ touch natively

---

### 8. Integrations

#### 8.1 Notion Export
- [ ] Settings: "Connect Notion" → OAuth flow → store access token
- [ ] Export flow: Recap page → "Export to Notion" button
- [ ] Tạo Notion page trong workspace đã connect:
  - Title: Pool title
  - Content: TL;DR, Agreements, Disagreements, Action Items (as to-do blocks)
  - Mindmap snapshot as embedded image
- [ ] API: Notion API v2 (`@notionhq/client`)
- [ ] Endpoint: `POST /api/pool/:id/export/notion`

#### 8.2 Jira Integration
- [ ] Settings: "Connect Jira" → API token + domain input
- [ ] Export flow: Recap page → Action Items → "Create Jira Issues"
- [ ] Mỗi Action Item → 1 Jira issue:
  - Summary: action item text
  - Description: pool context + relevant agent insights
  - Priority: map từ ActionItem.priority
  - Labels: "mindpool"
- [ ] API: Jira REST API v3
- [ ] Endpoint: `POST /api/pool/:id/export/jira`

#### 8.3 Integration Architecture
- [ ] `integrations/` module trong server:
  ```
  integrations/
  ├── notion.integration.ts
  ├── jira.integration.ts
  └── integration.interface.ts   # Common interface cho future integrations
  ```
- [ ] Settings UI: "API & Integrations" section — mỗi integration có Connect/Disconnect + status indicator

---

### 9. LLM Providers Mở Rộng

#### 9.1 New Providers
Chỉ cần implement `LLMProvider` interface đã định nghĩa từ Phase 1:

| Provider | Models | Use Case | Notes |
|---|---|---|---|
| **OpenAI** | GPT-4o, GPT-4o-mini, o3-mini | Full response, reasoning | OpenAI SDK, streaming support |
| **Gemini** | Gemini 2.0 Flash, Gemini 2.5 Pro | Cheap relevance check, recap | Google AI SDK, fast |
| **DeepSeek** | DeepSeek R1, V3 | Deep reasoning, visible thinking | OpenAI-compatible API format |

#### 9.2 Implementation Per Provider
- [ ] `openai.ts`:
  - `openai` npm package → `chat.completions.create({ stream: true })`
  - Map internal Message format ↔ OpenAI format
  - Handle streaming chunks → internal stream format
- [ ] `gemini.ts`:
  - `@google/generative-ai` package
  - Map internal format ↔ Gemini format
  - Handle `generateContentStream()` response
- [ ] `deepseek.ts`:
  - OpenAI-compatible API (same SDK, different base URL)
  - Handle reasoning tokens (thinking content)

#### 9.3 Settings UI Updates
- [ ] API key management: add/edit API keys cho mỗi provider
- [ ] Provider status: ✅ Connected / ❌ No API Key
- [ ] LLMRouter per-slot dropdown: mở rộng options với providers mới
- [ ] "Test Connection" button cho mỗi provider API key

---

### 10. Pool Templates

#### 10.1 Concept
Pre-configured pool setups cho common use cases — user chọn template → auto-fill topic + agents.

#### 10.2 Built-in Templates
| Template | Topic Seed | Suggested Agents |
|---|---|---|
| 🚀 Startup Idea Review | "Evaluate this startup idea: ..." | Business, Engineer, UX, Market |
| 🏗️ Architecture Review | "Review this system architecture: ..." | Engineer, Security, Data Scientist |
| 💰 Pricing Strategy | "Determine pricing for: ..." | Business, Data Scientist, Ethicist |
| 📱 Mobile vs Web | "Should we build mobile app or web for: ..." | Engineer, UX, Business |
| 🎯 Product Roadmap | "Prioritize features for: ..." | Business, UX, Engineer, Market |
| ⚖️ Risk Assessment | "Assess risks for: ..." | Security, Legal, Ethicist, Business |
| 🧑‍💼 Hiring Decision | "Should we hire for: ..." | Business, Creative Director, Ethicist |
| 📊 Data Strategy | "Design data strategy for: ..." | Data Scientist, Engineer, Security |

#### 10.3 Implementation
- [ ] `PoolTemplate` interface: `{ id, title, icon, topicSeed, suggestedAgentIds[], description }`
- [ ] Welcome screen: show templates as clickable cards (thay thế "Gợi ý chủ đề" pills từ Phase 1)
- [ ] Click template → navigate to Setup Chat → auto-fill topic + pre-suggest agents
- [ ] Templates hardcoded ban đầu → later: user-created templates

---

### 11. Multi-language (i18n)

- [ ] `react-i18next` integration
- [ ] Translation files: `vi.json` (default), `en.json`
- [ ] Scope Phase 3: UI labels + navigation only (agent responses vẫn bằng Vietnamese — controlled by system prompt)
- [ ] Settings: Language selector dropdown
- [ ] MindX system prompt adjustable by language preference
- [ ] Translation keys:
  ```
  nav.home, nav.history, nav.settings
  meeting.agents, meeting.speaking, meeting.queued, meeting.listening
  settings.profile, settings.model, settings.appearance
  welcome.title, welcome.subtitle, welcome.cta
  ...
  ```

---

### 12. Notification System

- [ ] In-app notification bell (topbar)
- [ ] Notification types:
  | Event | Message |
  |---|---|
  | `recap_ready` | "Recap cho '{pool.title}' đã sẵn sàng" |
  | `shared_pool_viewed` | "Pool '{pool.title}' được xem {viewCount} lần" |
  | `marketplace_approved` | "Agent '{template.title}' đã được approved" |
  | `marketplace_cloned` | "Agent '{template.title}' được clone bởi {userName}" |
- [ ] Data model: `Notification { userId, type, message, data, read, createdAt }`
- [ ] Backend: `notification.service.ts` → create notification + (optional) send email
- [ ] Frontend: `NotificationBell` (count badge) + `NotificationPanel` (dropdown list + mark as read)

---

## 📐 New API Endpoints Summary (Phase 3)

| Category | Method | Endpoint | Auth Required |
|---|---|---|---|
| **Auth** | POST | `/api/auth/register` | ❌ |
| | POST | `/api/auth/login` | ❌ |
| | GET | `/api/auth/google` | ❌ |
| | POST | `/api/auth/refresh` | ❌ |
| | GET | `/api/auth/me` | ✅ |
| | PUT | `/api/auth/profile` | ✅ |
| **Custom Agents** | POST | `/api/agents/custom` | ✅ |
| | PUT | `/api/agents/custom/:id` | ✅ |
| | DELETE | `/api/agents/custom/:id` | ✅ |
| | GET | `/api/agents/custom` | ✅ |
| | POST | `/api/agents/custom/:id/documents` | ✅ |
| **Marketplace** | GET | `/api/marketplace` | ✅ |
| | POST | `/api/marketplace/:id/clone` | ✅ |
| | POST | `/api/marketplace/submit` | ✅ |
| | POST | `/api/marketplace/:id/rate` | ✅ |
| **Share** | POST | `/api/pool/:id/share` | ✅ |
| | GET | `/api/shared/:token` | ❌ (public) |
| | DELETE | `/api/pool/:id/share/:tokenId` | ✅ |
| **Export** | POST | `/api/pool/:id/export/notion` | ✅ |
| | POST | `/api/pool/:id/export/jira` | ✅ |
| **Notifications** | GET | `/api/notifications` | ✅ |
| | PUT | `/api/notifications/:id/read` | ✅ |
| **Timeline** | GET | `/api/pool/:id/timeline` | ✅ |

---

## 🗄️ Schema Changes (so với Phase 2)

### New Collections
```typescript
// User
{ email, name, avatar, initials, authProvider, passwordHash?, googleId?, settingsId, createdAt, lastLoginAt }

// AgentTemplate (Marketplace)
{ authorId, title, description, icon, specialty, personality, systemPromptTemplate, category, tags, cloneCount, rating, status, createdAt }

// ShareToken
{ poolId, userId, token, includeThinking, includeMindmap, includeRecap, expiresAt, viewCount, isRevoked, createdAt }

// RagDocument
{ agentId, userId, filename, originalSize, mimeType, chunkCount, status, uploadedAt }

// DocumentChunk
{ documentId, agentId, text, embedding, chunkIndex, tokenCount }
// ↑ Cosine similarity computed in-app (không dùng Atlas Vector Search)

// Notification
{ userId, type, message, data, read, createdAt }
```

### Modified Collections
```diff
  Pool {
    ...Phase 2 fields...
+   userId: string,              // Owner
+   shareTokens: [ShareTokenId],
+   templateId: string | null,   // If created from template
+   timelineSegments: TimelineSegment[],
  }

  Agent {
    ...Phase 2 fields...
+   userId: string | null,       // null = built-in, string = custom
+   ragDocuments: [RagDocumentId],
+   isPublished: boolean,
+   templateId: string | null,
  }

  Settings {
    ...Phase 2 fields...
+   userId: string,              // ← required now (no more "default")
+   language: 'vi' | 'en',
+   integrations: {
+     notion: { accessToken?, workspaceId?, connected: boolean },
+     jira: { apiToken?, domain?, email?, connected: boolean },
+   },
  }

  Conversation {
    ...Phase 2 fields...
+   userId: string,
  }
```

---

## 🔄 Migration Plan (Phase 2 → Phase 3)

| Step | Description |
|---|---|
| 1 | Create `users` collection |
| 2 | Create default user from existing Settings data |
| 3 | Add `userId` field to all existing Pools, Conversations, Settings docs (set to default user) |
| 4 | Add MongoDB indexes: `Pool.userId`, `Agent.userId`, `Conversation.userId` |
| 5 | Create text index on `AgentTemplate.title` + `description` + `tags` for search |
| 6 | Create compound index on `DocumentChunk` (`agentId` + `documentId`) |
| 7 | Deploy auth middleware (with backward-compatible mode for first deploy) |

---

## ✅ Definition of Done

- [ ] User can register/login (email + Google), JWT auth works end-to-end
- [ ] Existing data migrated to first registered user
- [ ] Custom agent tạo được với personality sliders → system prompt auto-generated → agent hoạt động đúng trong meetings
- [ ] RAG: upload PDF → agent phát biểu có context từ document
- [ ] Marketplace: browse templates, clone to my agents, submit own agent, rate templates
- [ ] Timeline view: show agent activity bars, click segment → scroll to message
- [ ] Share: generate link → open in incognito → read-only view hiển thị đúng
- [ ] Share link hết hạn sau expire time, revoke hoạt động đúng
- [ ] Mobile: responsive layout không vỡ trên iPhone 14/15, Android
- [ ] Bottom nav bar trên mobile hoạt động đúng
- [ ] Notion export: tạo page đúng format trong Notion workspace
- [ ] Jira export: tạo issues đúng từ action items
- [ ] New LLM providers: thêm OpenAI/Gemini/DeepSeek, switching provider trong Settings → agent response vẫn đúng
- [ ] Pool templates: click template → auto-fill setup chat
- [ ] i18n: switch language in Settings → UI labels thay đổi
- [ ] Notifications: recap ready → notification bell badge
- [ ] E2E tests: auth, agent-builder, marketplace, share-pool, mobile specs pass
- [ ] TypeScript strict — 0 errors




## 📌 Dependencies & Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Auth migration breaks existing data | Users lose pools/history | Migration script + backup + backward-compatible mode |
| RAG vector search performance | Slow agent response | Cache frequently accessed chunks, limit chunks per agent, in-app cosine similarity đủ nhanh cho scale nhỏ-trung |
| RAG scale lớn (> 10K chunks) | In-app similarity chậm | Migrate sang Qdrant self-hosted hoặc Pinecone khi cần |
| Marketplace content quality | Low-quality agent templates | Manual review Phase 3, automated scan Phase 4 |
| Mobile CSS complexity | Đèo layout bugs | Dedicated mobile QA pass, device farm testing |
| Multiple LLM provider API changes | Breaking changes | Provider abstraction isolates impact, version pin SDKs |
| Notion/Jira OAuth token expiry | Silent integration failure | Token refresh logic + UI status indicator |
| Large RAG documents | Memory spike during processing | Stream-based parsing, chunk in batches |
| Share token security | Unauthorized data access | Rate limiting, short tokens (nanoid), revoke mechanism |
| i18n missing translations | UI shows keys instead of text | Fallback language (Vietnamese), CI check for missing keys |

---

## 🧭 Phase 3 → Phase 4 Preview

Những gì sẽ unlock sau Phase 3:
- **Billing/Subscription** — cần auth trước (Phase 3 ✅)
- **Real-time collaboration** — cần shared pools + auth (Phase 3 ✅)
- **Plugin SDK** — cần marketplace + integration pattern (Phase 3 ✅)
- **Advanced analytics** — cần recap data + user data (Phase 3 ✅)
- **Voice input** — cần mobile responsive (Phase 3 ✅)
- **White-label** — cần i18n + theming (Phase 3 ✅)
- **Card Board View (Kanban)** — visualization thứ 4 từ idea.md (Section 4 Option D), deferred sau Phase 3. Group ý kiến theo chủ đề (PRO/CON). Implement dựa trên user feedback demand.
