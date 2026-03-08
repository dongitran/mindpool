# 🧠 Mindpool — Idea Document

> *"Tạo một phòng họp với những chuyên gia AI tốt nhất — bất cứ lúc nào, về bất cứ chủ đề gì."*

---

## 1. Vision

**Mindpool** là một nền tảng AI cho phép người dùng tạo ra các "pool" — phòng thảo luận nơi nhiều AI agent chuyên gia cùng nhau phân tích, tranh luận và đưa ra góc nhìn đa chiều về bất kỳ chủ đề nào. Mỗi agent đại diện cho một lĩnh vực chuyên môn riêng — từ kỹ thuật, kinh doanh, UX, đạo đức cho đến lịch sử hay sáng tạo.

Điểm khác biệt cốt lõi: người dùng không chỉ nhận được **một câu trả lời duy nhất**, mà được nghe **nhiều góc nhìn chuyên môn tranh luận với nhau** — giúp đưa ra quyết định toàn diện hơn và học cách các chuyên gia khác nhau tiếp cận cùng một vấn đề.

---

## 2. Core Concept

```
User đặt câu hỏi / chủ đề
        ↓
MindX gợi ý danh sách agent phù hợp
        ↓
User xác nhận hoặc tùy chỉnh lineup
        ↓
Mindpool được tạo — các agents bắt đầu thảo luận
        ↓
User quan sát, học hỏi, tương tác — đặt câu hỏi trực tiếp cho từng agent
        ↓
Kết thúc pool → Synthesis & Action Items
```

---

## 3. User Flow Chi Tiết

### 3.1 Setup Phase — Chat Interface (ChatGPT-style)

Giao diện ban đầu là một ô chat đơn giản. Người dùng nhắn tin tự nhiên như đang nói chuyện với trợ lý. **Một conversation với MindX có thể tạo ra nhiều meeting khác nhau** — mỗi lần tạo là một meeting độc lập mới.

**Ví dụ flow trong một conversation:**

```
👤 "Tôi muốn thảo luận về việc có nên build
    mobile app cho startup fintech không"

🤖 Chủ đề hay! Tôi gợi ý những expert sau:
   ✅ 📱 Mobile Engineer  ✅ 💼 Business Strategist
   ✅ 👤 UX Designer      ✅ 🔒 Security Expert
   ⬜ 📜 Legal Advisor — thêm vào không?

   ┌─────────────────────────────────┐
   │  🚀 Bắt đầu Meeting             │  ← button
   └─────────────────────────────────┘

──────────────────────────────────────────────
👤 "Thêm Legal vào đi, và tôi muốn thêm 1
    meeting khác về pricing strategy"

   ↓ Block agent suggestions phía trên UPDATE INLINE:

🤖 Chủ đề hay! Tôi gợi ý những expert sau:
   ✅ 📱 Mobile Engineer  ✅ 💼 Business Strategist
   ✅ 👤 UX Designer      ✅ 🔒 Security Expert
   ✅ 📜 Legal Advisor    ← checked rồi (update tại chỗ)

   ┌─────────────────────────────────┐
   │  🚀 Bắt đầu Meeting             │
   └─────────────────────────────────┘

🤖 Đã thêm Legal! Và cho pricing strategy, tôi gợi ý:
   ✅ 💼 Business Strategist  ✅ 📊 Data Scientist
   ✅ 🌍 Market Analyst

   ┌─────────────────────────────────┐
   │  🚀 Bắt đầu Meeting             │  ← button mới
   └─────────────────────────────────┘
```

**Nguyên tắc UX quan trọng:** Khi user thêm/bớt agent qua chat, block suggestion **không tạo mới** — nó **update inline tại chỗ**. MindX chỉ confirm bằng text ngắn gọn bên dưới, rồi tiếp tục xử lý yêu cầu tiếp theo (nếu có).

**Khi nhấn "Bắt đầu Meeting":**
- Meeting được tạo ngay lập tức
- Button chuyển thành **Meeting Card** inline trong conversation:

```
   ┌─────────────────────────────────────────┐
   │  ✅ Mobile App Strategy                  │
   │  📱💼👤🔒⚖️ · Tạo lúc 10:32 AM          │
   │                                          │
   │  [→ Vào Meeting]                         │
   └─────────────────────────────────────────┘
```

**Khi xem lại conversation cũ:**
- Meeting card vẫn hiển thị đúng chỗ trong lịch sử chat
- Button `[→ Vào Meeting]` redirect sang meeting đã tạo trước đó
- Không tạo meeting mới — chỉ navigate tới meeting cũ

**MindX có khả năng:**
- Gợi ý agent dựa trên chủ đề (NLP intent detection)
- Cho phép refine qua nhiều lượt nhắn — "thêm luật sư vào", "bỏ legal đi"
- Update block agent suggestion inline khi user thay đổi lineup
- Hỏi thêm context — "Startup bạn đang ở giai đoạn nào? Ngân sách?"
- Tạo nhiều meeting trong cùng một conversation, mỗi cái độc lập

---

### 3.2 Pool Phase — Meeting Room Interface

Sau khi setup xong, giao diện chuyển sang **Pool View** — nơi cuộc thảo luận diễn ra.

**Layout gợi ý:**

```
┌─────────────────────────────────────────────────────┐
│  🧠 Mindpool: "Mobile App cho Fintech Startup"      │
│  Agents: 4 · Status: Live · Duration: 00:03:42      │
├──────────────┬──────────────────────────────────────┤
│   AGENTS     │         DISCUSSION FEED               │
│  ─────────   │                                       │
│  📱 Mobile   │  💼 Business Strategist:              │
│  Engineer    │  ┌─ 💭 Thinking... ──────────────┐   │
│  ● Active    │  │ "User đang ở seed stage, vậy  │   │
│              │  │  native app hay PWA sẽ tiết   │   │
│  💼 Business │  │  kiệm burn rate hơn?..."      │   │
│  Strategist  │  └───────────────────────────────┘   │
│  ● Thinking  │                                       │
│              │  → "Tôi khuyến nghị bắt đầu với      │
│  👤 UX       │     React Native thay vì native       │
│  Designer    │     riêng biệt. Cost giảm 40%,        │
│  ○ Waiting   │     time-to-market nhanh hơn 2x."     │
│              │                                       │
│  🔒 Security │  📱 Mobile Engineer phản hồi:         │
│  Expert      │  ┌─ 💭 Thinking... ──────────────┐   │
│  ○ Waiting   │  │ "React Native với fintech có  │   │
│              │  │  vấn đề về security layer..."  │   │
│  ─────────   │  └───────────────────────────────┘   │
│  + Add Agent │                                       │
│              │  → "Đúng về cost, nhưng với PCI       │
│              │     DSS compliance, Flutter cho        │
│              │     security layer tốt hơn..."         │
│              │  ─────────────────────────────────    │
│              │  👤 Bạn: Thế còn PWA thì sao?         │
└──────────────┴──────────────────────────────────────┘
│  💬 Nhắn tin với agents...                    [Gửi] │
└─────────────────────────────────────────────────────┘
```

---

### 3.3 Visible Thinking — Feature Cốt Lõi

Mỗi agent có **2 lớp output**:

```
┌─────────────────────────────────────────────┐
│  💼 Business Strategist                     │
│                                             │
│  💭 [Thinking - có thể expand/collapse]     │
│  ┌────────────────────────────────────────┐ │
│  │ "Startup ở seed stage... burn rate    │ │
│  │  quan trọng hơn feature richness.     │ │
│  │  Competitor analysis: Momo, ZaloPay   │ │
│  │  đều bắt đầu với app native... nhưng  │ │
│  │  context 2024 khác 2019 nhiều..."     │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  💬 Phát biểu:                              │
│  "Với seed budget, tôi recommend PWA        │
│   trước — validate product-market fit       │
│   rồi mới invest vào native app."           │
└─────────────────────────────────────────────┘
```

**Giá trị của Visible Thinking:**
- Người dùng học được **mental model** của từng expert
- Thấy được tại sao agent đưa ra kết luận đó
- Có thể expand để đọc sâu, hoặc collapse để đọc nhanh

---

## 4. Visualization Options — Brainstorm

### Option A: Linear Feed (MVP)
Đơn giản nhất — như Slack/ChatGPT nhưng có nhiều người nói.
- ✅ Dễ implement
- ✅ Familiar UX
- ❌ Khó thấy mối liên hệ giữa các ý kiến

### Option B: 🌟 Mindmap View (Flagship Feature)

Cuộc trò chuyện được visualize thành mindmap động:

```
                    [Chủ đề chính]
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  [Tech Stack]    [Business Case]   [UX Impact]
      │                 │                │
  ┌───┴───┐         ┌───┴───┐        ┌───┴───┐
[Flutter] [RN]   [Cost] [Speed]  [Onboard][Retain]
    │                 │
[Security ⚠️]    [PWA option]
    │
[PCI DSS note]
```

**Tính năng mindmap:**
- Node màu theo agent (xanh = Engineer, vàng = Business...)
- Click vào node → xem full discussion thread đó
- Zoom in/out — overview toàn bộ hoặc deep dive 1 nhánh
- Export mindmap thành PNG/PDF
- Real-time — node mới xuất hiện khi agent nói

**Tech:** `React Flow` hoặc `D3.js` cho mindmap rendering

### Option C: Timeline View

Trục thời gian ngang — thấy được ai nói khi nào, debate diễn ra như thế nào:

```
─────────────────────────────────────────────────────►
0:00    0:30    1:00    1:30    2:00    2:30    3:00

📱 ████░░░░████░░░░░░░░████████░░░░░░░░░░░░░
💼 ░░░░████░░░░████░░░░░░░░░░░░████████░░░░
👤 ░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░░████
```

Useful để replay lại cuộc họp.

### Option D: Card Board View (Kanban-style)

Mỗi ý kiến chính là một card, group theo chủ đề:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  PRO Native │  │  PRO PWA    │  │  PRO RN     │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ 🔒 Security │  │ 💼 Burn rate│  │ 📱 Dev speed│
│ compliance  │  │ thấp hơn    │  │ nhanh hơn   │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ 👤 Better   │  │ 💼 Validate │  │ 💼 1 codebase│
│ UX possible │  │ trước       │  │ 2 platform  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Option E: 🌟 Split View — Best of Both

```
┌─────────────────────┬──────────────────────────┐
│    💬 CHAT FEED     │      🗺️ MINDMAP          │
│                     │                          │
│  Real-time          │   Dynamic, auto-update   │
│  conversation       │   khi có ý mới           │
│  với thinking       │                          │
│  visible            │   Click node ↔ highlight │
│                     │   message tương ứng      │
└─────────────────────┴──────────────────────────┘
```

**→ Recommended approach:** Mặc định Split View, toggle được giữa Chat / Mindmap / Timeline.

---

## 5. Raise Hand — Cơ Chế Phát Biểu

### Vấn đề
Trong một cuộc họp thật, không ai nói cùng lúc — có người chủ trì, có lượt phát biểu. Nếu tất cả agents cùng reply một lúc thì loạn, mất đi cảm giác "meeting" thật sự.

### Cơ chế Raise Hand

```
┌──────────────────────────────────────────────────────┐
│  💼 Business Strategist đang phát biểu...            │
│  "Với seed budget, tôi recommend PWA trước..."       │
│                                                      │
│  🙋 Đang chờ phát biểu:                             │
│  [📱 Mobile Engineer]  [🔒 Security Expert]          │
│                                                      │
│  ○ 👤 UX Designer      ○ 📊 Data Scientist           │
└──────────────────────────────────────────────────────┘
```

**Flow chi tiết:**

```
Agent A đang phát biểu
      │
      ├─► Tất cả agents khác nhận được nội dung của A (parallel)
      │         │
      │         ▼
      │   Mỗi agent tự đánh giá nhanh:
      │   "Message này có liên quan đến mình không?
      │    Mình có góc nhìn gì để bổ sung không?"
      │         │
      │    ┌────┴────┐
      │   CÓ        KHÔNG
      │    │          │
      │    ▼          ▼
      │  Tự thêm     Tiếp tục
      │  vào Queue   lắng nghe
      │  ✋          ○
      │
      ▼
   Agent A nói xong
      │
      ▼
   Queue: [📱 Mobile Engineer] → [🔒 Security Expert] → ...
      │
      ▼
   MindX cấp quyền cho agent đầu queue
```

**Điểm mấu chốt:** Agent **chủ động tự raise hand** — không ai gọi, không ai assign. Giống người thật trong meeting: nghe xong thấy có điều muốn nói thì tự giơ tay, hết lượt người trước thì mình lên.

**Queue Rules:**

| Rule | Mô tả |
|---|---|
| **FIFO cơ bản** | Raise hand trước → lên trước |
| **User interrupt** | User nhắn tin → MindX pause queue, route đến agent phù hợp, resume sau |
| **Queue timeout** | Agent raise hand nhưng đến lượt mà context đã cũ → tự drop khỏi queue |
| **Max queue depth** | Giới hạn queue 3-4 người — nếu đầy, agent mới phải chờ context tiếp theo |

**UI Queue — hiển thị trực quan:**

```
Agent Panel (sidebar):

🎤 💼 Business Strategist   ← đang nói, highlight + mic animation
✋ 1  📱 Mobile Engineer     ← queue #1, badge số thứ tự
✋ 2  🔒 Security Expert     ← queue #2
○    👤 UX Designer          ← đang lắng nghe
○    📊 Data Scientist        ← đang lắng nghe
```

**Thinking pipeline:**
- Tất cả agents nhận message mới → chạy **"relevance check"** nhỏ (cheap prompt) để quyết định có raise hand không
- Chỉ agent đang phát biểu mới chạy **full thinking** → tiết kiệm API cost đáng kể
- Agent trong queue → giữ nguyên context, chờ đến lượt mới generate full response

---

## 6. MindX — Orchestrator Agent

### Tên & Vai Trò

**MindX** là agent điều phối mặc định, tự động được thêm vào **mọi pool**. MindX phụ trách xuyên suốt từ setup phase đến kết thúc meeting — không có chuyên môn domain riêng, chỉ tập trung vào **vận hành**.

**Setup phase:** MindX chat với user, gợi ý agent lineup phù hợp, xử lý refine request (thêm/bớt agent inline), tạo pool.

**Meeting phase:** MindX chọn agent mở đầu, quản lý raise-hand queue, xử lý user interrupt, theo dõi stop signals, và trigger wrap-up.

> *"Nhạc trưởng không chơi nhạc cụ nào — nhưng không có nhạc trưởng, dàn nhạc chỉ là một đám người chơi cùng lúc."*

MindX không bao giờ nói "tôi nghĩ..." hay đưa ra ý kiến domain. Chỉ nói: *"Tiếp theo chúng ta nghe từ..."*, *"Để tổng hợp lại..."*, *"Có vẻ chúng ta đã đồng thuận về..."*

---

### Luồng Vận Hành Chi Tiết

#### Ví dụ với 5 agents: A1 A2 A3 A4 A5

```
[POOL START]
      │
      ▼
MindX phân tích topic → chọn agent phù hợp nhất mở đầu → A1
      │
      ▼
A1 phát biểu (full generation + thinking)
      │
      ├── [Song song] A2, A3, A4, A5 chạy relevance check (cheap API call)
      │         "Message này có trigger mình không?"
      │
      │   Kết quả: A3 ✋  A4 ✋  A5 ✋  |  A2 ✗
      │
      ▼
Queue: [A3 → A4 → A5]          ← FIFO theo thứ tự raise hand
      │
      ▼
MindX cấp quyền → A3 phát biểu
      │
      ├── [Song song] Chỉ A1 và A2 chạy relevance check
      │         A3 vừa nói → skip
      │         A4, A5 đang trong queue → skip
      │
      │   Kết quả: A1 ✋  |  A2 ✗
      │
      ▼
Queue: [A4 → A5 → A1]          ← A1 append vào cuối
      │
      ▼
MindX cấp quyền → A4 phát biểu
      │
      ├── [Song song] Chỉ A2 và A3 chạy relevance check
      │         A4 vừa nói → skip
      │         A5, A1 đang trong queue → skip
      │
      ... (tiếp tục xoay vòng)
```

**Nguyên tắc incremental check — tiết kiệm API:**

| Trạng thái agent | Có chạy relevance check? |
|---|---|
| Vừa phát biểu xong | ❌ Skip |
| Đang trong queue rồi | ❌ Skip |
| Đang Listening | ✅ Check |

Tại mỗi turn, **chỉ các agent đang Listening mới gọi API** — số lượng call giảm dần khi queue đầy.

---

### Edge Cases & Cách Xử Lý

#### Queue trống sau một turn
Không agent nào raise hand → MindX không ngồi im:
```
Bước 1: MindX kiểm tra agent nào im lặng lâu nhất
Bước 2: "Data Scientist — góc nhìn analytics ở đây thế nào?"
Bước 3: Nếu tất cả agents đều pass → tính là 1 Stop Signal
```

#### Context drift
Agent raise hand khi nghe turn N, nhưng đến lượt mình (turn N+4) topic đã shift:
```
Trước khi phát biểu, agent nhận full context hiện tại
→ Re-evaluate: "Response cũ còn relevant không?"
→ Nếu không → tự drop khỏi queue, không phát biểu
→ MindX chuyển sang agent tiếp theo
```

#### User interrupt
```
User nhắn tin giữa chừng
      │
      ▼
MindX: pause queue (giữ nguyên thứ tự)
      │
      ▼
MindX phân tích câu hỏi → route đến agent phù hợp nhất
      │
      ▼
Agent đó trả lời trực tiếp user
      │
      ▼
MindX: resume queue từ đúng chỗ đã dừng
```

#### Debate loop
A1 và A2 cứ phản bác nhau vòng vòng, không có insight mới:
```
MindX phát hiện: cùng 2 agents trong queue liên tục ≥ 3 lần
      │
      ▼
MindX can thiệp: "Điểm bất đồng cốt lõi là X.
                  Agent nào có góc nhìn thứ 3 không?"
      │
      ▼
Mời agent đang Listening vào làm arbitrator
```

---

### Cơ Chế Dừng — 5 Stop Signals

MindX theo dõi liên tục, khi **3/5 signals** xuất hiện → trigger kết thúc:

| Signal | Điều kiện |
|---|---|
| **1. Queue trống** | Không agent nào raise hand sau turn vừa rồi |
| **2. Repetition** | Nội dung mới trùng lặp ≥ 70% với message đã có |
| **3. Convergence** | Các agents đang đồng thuận thay vì tranh luận |
| **4. Coverage complete** | Tất cả angle của topic ban đầu đã được address |
| **5. User trigger** | User nói "okay", "cảm ơn", "đủ rồi", hoặc nhấn End |

Khi dừng, MindX auto-generate wrap-up:
```
MindX: "Chúng ta đã cover đủ các góc nhìn chính.

        ✓ Đồng thuận: React Native là lựa chọn phù hợp
        ⚠️ Cần lưu ý: PCI DSS cần native module riêng
        ❓ Còn open: Timeline phụ thuộc vào hiring plan

        Action items:
        1. POC với RN + biometric auth
        2. Consult security team về PCI scope
        3. Confirm Q2 hiring budget"
```

---

### Meeting Temperature

MindX theo dõi "nhiệt kế" để can thiệp đúng lúc:

| Trạng thái | Dấu hiệu | MindX làm gì |
|---|---|---|
| 🟢 **Productive** | Mỗi turn có insight mới, agents build on nhau | Tiếp tục, không can thiệp |
| 🟡 **Stalling** | Queue thưa, agents bắt đầu repeat | Mời agent im lặng vào, hoặc đổi góc câu hỏi |
| 🔴 **Stuck** | 2 agents loop debate, không ai break tie | Can thiệp chủ động, gọi arbitrator |

---

### Toàn Bộ Vòng Đời Một Pool

```
[User tạo pool]
      ↓
[MindX] — phân tích topic, assign agent mở đầu
      ↓
[Agent phát biểu] — full thinking + response
      ↓
[Listening agents] — relevance check song song (cheap)
      ↓
[MindX] — cập nhật queue (chỉ thêm agents mới raise hand)
      ↓
[MindX] — kiểm tra stop signals
      ↓ (chưa đủ 3/5)
[MindX] — cấp quyền cho agent đầu queue
      ↓
      ... loop ...
      ↓ (đủ 3/5 stop signals)
[MindX] — wrap up, tổng hợp, action items
      ↓
[Pool Completed → Auto Recap]
```

---

## 7. Visible Thinking — Thiết Kế

### Vấn đề thực tế
Hầu hết người dùng AI **không mở phần thinking** khi dùng DeepSeek, Claude Extended Thinking hay các model tương tự — dù tính năng đó có giá trị. Thinking thường dài, technical, và interrupt flow đọc.

### Nguyên tắc thiết kế: **Compact, giống Claude**

Không cần label dài dòng. Chỉ một nút nhỏ inline:

**Collapsed (mặc định):**
```
💼 Business Strategist
▶ Thought for 4 seconds
"Với seed budget, tôi recommend PWA trước..."
```

**Expanded (sau khi click):**
```
💼 Business Strategist
▼ Thought for 4 seconds
┌────────────────────────────────────────────────────┐
│ User đang ở seed stage... burn rate quan trọng     │
│ hơn feature richness lúc này. Nhìn lại Momo và    │
│ ZaloPay — họ bắt đầu với app native năm 2019,     │
│ nhưng context 2024 hoàn toàn khác...               │
└────────────────────────────────────────────────────┘
"Với seed budget, tôi recommend PWA trước..."
```

### Khi nào thinking thực sự có giá trị?

| User type | Hành vi | Giá trị |
|---|---|---|
| **Người mới học** | Mở thinking để xem expert suy nghĩ thế nào | ⭐⭐⭐⭐⭐ |
| **Decision maker** | Muốn hiểu *tại sao* agent kết luận vậy | ⭐⭐⭐⭐ |
| **Power user** | Muốn catch được bias hoặc logic lỗi | ⭐⭐⭐ |
| **Casual user** | Chỉ cần kết luận, không cần quá trình | ⭐ |

→ **Kết luận:** Compact như Claude là đủ. Không cần label dài, không cần alternatives phức tạp.

---

## 8. Conversation & Pool History

### 8.1 History Dashboard

```
┌─────────────────────────────────────────────────────┐
│  🧠 My Mindpools                    [+ New Pool]    │
├─────────────────────────────────────────────────────┤
│  📁 Pinned                                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔥 Mobile App Strategy                      │   │
│  │ 4 agents · 23 min · 3 days ago              │   │
│  │ 📱💼👤🔒  → Summary: "Recommend PWA first"  │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  📅 This Week                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ 💡 Startup Name Brainstorm                  │   │
│  │ 3 agents · 15 min · 1 day ago               │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🏗️ System Architecture Review              │   │
│  │ 5 agents · 45 min · 2 days ago              │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  📅 Last Month                                      │
│  │ 10 pools ›                                       │
└─────────────────────────────────────────────────────┘
```

### 8.2 Pool Recap Page

Sau mỗi pool, auto-generate:
- **TL;DR** — 3-5 bullet points kết luận chính
- **Disagreements** — Những điểm agents không đồng ý với nhau
- **Action Items** — Việc cần làm tiếp theo
- **Agent Scores** — Agent nào contribute nhiều nhất
- **Mindmap snapshot** — Export được

---

## 9. Agent Library

### Built-in Agents (v1)

| Agent | Icon | Specialty | Signature Question |
|---|---|---|---|
| Business Strategist | 💼 | ROI, market, competition | "Ai trả tiền và tại sao?" |
| Software Engineer | 👨‍💻 | Tech stack, feasibility, scale | "Build được không? Cost bao nhiêu?" |
| UX Designer | 🎨 | User behavior, friction, flow | "User thực sự cảm thấy gì?" |
| Security Expert | 🔒 | Vulnerabilities, compliance | "Điểm yếu nằm ở đâu?" |
| Data Scientist | 📊 | Metrics, evidence, patterns | "Số liệu nói gì?" |
| Legal Advisor | ⚖️ | Risk, compliance, contracts | "Điều gì có thể kiện được?" |
| Creative Director | ✨ | Narrative, differentiation | "Điều gì sẽ được nhớ mãi?" |
| Ethicist | 🌍 | Second-order effects, fairness | "Ai bị ảnh hưởng không tốt?" |
| Market Analyst | 📈 | Trends, competitors, TAM | "Thị trường đang đi đâu?" |
| Devil's Advocate | 😈 | Challenge mọi assumption | "Tại sao cái này sẽ fail?" |

### Custom Agents (v2)

Người dùng tự tạo agent với persona riêng:
- Tên, avatar, chuyên môn, personality
- Upload document để agent "học" (RAG)
- Ví dụ: "Senior Dev tại UrBox", "Khách hàng 30 tuổi tại TP.HCM"

---

## 10. Tech Stack

### Frontend — ReactJS

**Key libraries:**
- `React Flow` — Mindmap visualization
- `Zustand` — State management
- `TailwindCSS` — Styling
- `Framer Motion` — Animation cho thinking bubbles
- `EventSource` — SSE cho real-time streaming

### Backend — ExpressJS

**Key libraries:**
- `Kimi SDK (Moonshot AI)` + `MiniMax SDK` — Primary LLM providers *(xem chi tiết bên dưới)*
- `Provider Abstraction Layer` — Interface chung để dễ thêm model mới
- `MongoDB` + `Mongoose` — Lưu pool history
- `SSE (Server-Sent Events)` — Real-time streaming
- `Redis` — Cache active pools & queue state

### LLM Providers

#### 🌙 Kimi (Moonshot AI) — Primary Model

Kimi là AI model của **Moonshot AI** (Trung Quốc, founded 2023, backed by Alibaba), nổi bật với:

| Model | Đặc điểm | Use case trong Mindpool |
|---|---|---|
| `kimi-k2.5` | Natively multimodal (text + vision), 1T params (32B active), MoE architecture | Agent phức tạp, cần suy luận sâu |
| `kimi-k2` | Open-source weights (MIT), 1T total params, tool-use mạnh | Agent chính trong most meetings |
| `kimi-k2-thinking` | Reasoning mode, hỗ trợ 256K context, 200-300 sequential tool calls | Visible thinking cho agents |

**API:** Compatible với OpenAI API format — Bearer Token, dễ switch. Moonshot cung cấp "Kimi Cookbook" với integration examples.

**Tại sao chọn Kimi:**
- Long-context vượt trội — agents cần đọc toàn bộ lịch sử meeting
- Agentic capabilities built-in — phù hợp với raise-hand & queue logic
- Agent Swarm support — có thể coordinate nhiều agents song song
- Giá cạnh tranh hơn Anthropic/OpenAI

#### 🤖 MiniMax — Secondary / Specialization Model

MiniMax là AI company Trung Quốc với focus vào enterprise + long-context:

| Model | Đặc điểm | Use case trong Mindpool |
|---|---|---|
| `MiniMax-M2.5` | 204,800 token context, ~60-100 tps output speed, mạnh về coding & tool calling | Agents cần response nhanh, relevance check |
| `MiniMax-Text-01` | 456B params (45.9B active), context cực lớn tới **4M tokens**, open-source | Archive & recap processing |
| `MiniMax-M2.1` | Multi-language, code understanding, dialogue mạnh | Custom agents phức tạp |

**API:** REST API với Bearer Token, pricing thấp, output speed nhanh (~100 tps high-speed mode).

**Tại sao chọn MiniMax:**
- Tốc độ output cao → phù hợp làm **relevance check** (cheap prompt) cần response nhanh
- Context window cực lớn (4M tokens) → dùng cho recap processing sau meeting dài
- Giá rẻ → phù hợp cho parallel calls khi nhiều agents cùng check relevance

#### 🔌 Provider Abstraction Layer — Extensible Architecture

Thiết kế backend với **2 lớp rõ ràng**: một `LLMProvider` interface chung cho từng provider cụ thể, và một `LLMRouter` đứng trên điều phối tất cả dựa theo config từ Settings.

```typescript
// Lớp 1: Interface chung — mọi provider đều phải implement
interface LLMProvider {
  id: string;   // 'kimi' | 'minimax' | 'openai' | ...
  chat(messages: Message[], model: string, options: ChatOptions): Promise<Stream>;
}

// Lớp 2: LLMRouter — lớp trung gian DUY NHẤT mà Express Server gọi đến
class LLMRouter {
  private providers: Map<string, LLMProvider>;
  private config: RouterConfig;  // load từ user Settings

  // Express Server chỉ gọi router, không cần biết provider là gì
  async agentChat(callType: 'full_response' | 'relevance_check' | 'recap', ...args) {
    const { provider, model } = this.config.resolve(callType);
    return this.providers.get(provider).chat(messages, model, options);
  }
}

// RouterConfig — user cấu hình trong Settings
const defaultConfig: RouterConfig = {
  full_response:    { provider: 'kimi',    model: 'kimi-k2' },
  relevance_check:  { provider: 'minimax', model: 'MiniMax-M2.5' },
  recap_synthesis:  { provider: 'minimax', model: 'MiniMax-Text-01' },
  // User có thể override bất kỳ slot nào trong Settings
};

// Registered providers — thêm provider mới chỉ cần implement interface
const registry = {
  kimi:    new KimiProvider({ apiKey: process.env.KIMI_API_KEY }),
  minimax: new MinimaxProvider({ apiKey: process.env.MINIMAX_API_KEY }),
  // Tương lai có thể thêm:
  // openai:    new OpenAIProvider(...),
  // anthropic: new AnthropicProvider(...),
  // gemini:    new GeminiProvider(...),
  // deepseek:  new DeepSeekProvider(...),
};
```

**Routing strategy (default — user cấu hình được trong Settings):**
- **Full agent response** → `kimi-k2` (quality, agentic)
- **Relevance check / cheap calls** → `minimax-m2.5` (speed + cost)
- **Long recap / synthesis** → `minimax-text-01` (4M context)
- **Mỗi slot có thể override** → VD: user muốn full response dùng `openai/gpt-4o` thay vì Kimi

### Architecture Flow

```
Browser             Express Server       LLMRouter          Providers       LLM APIs
   │                      │                  │                   │               │
   │── POST /pool/create ─►                  │                   │               │
   │◄─ pool_id ──────────│                  │                   │               │
   │                      │                  │                   │               │
   │── GET /stream ───────►                  │                   │               │
   │   (SSE connection)   │                  │                   │               │
   │                      │─ agentChat()     │                   │               │
   │                      │  type: full ─────► resolve config    │               │
   │◄─ stream: mindx ─────│◄─ stream ────────│── chat(kimi-k2) ─► KimiProvider ─►│
   │                      │                  │◄─ stream ─────────│◄──────────────│
   │                      │─ agentChat()     │                   │               │
   │                      │  type: full ─────► resolve config    │               │
   │◄─ stream: thinking ──│◄─ stream ────────│── chat(kimi-k2) ─► KimiProvider ─►│
   │◄─ stream: message ───│                  │◄─ stream ─────────│◄──────────────│
   │                      │─ agentChat() x N │                   │               │
   │                      │  type: relevance ► resolve config    │               │
   │◄─ stream: queue ─────│◄─ [true/false] ──│── chat(M2.5) ────► MinimaxProvider►│
   │                      │  (parallel)      │◄─ results ────────│◄──────────────│
   │                      │                  │                   │               │
```

> **Nguyên tắc:** Express Server **chỉ gọi `LLMRouter`** — không biết provider nào đang chạy phía sau. Muốn đổi sang Gemini hay DeepSeek? Chỉ cần update `RouterConfig` trong Settings, không sửa logic business.

---

## 11. Database Schema

```javascript
// Pool
{
  _id: ObjectId,
  title: String,
  topic: String,
  status: "setup" | "active" | "completed",
  agents: [AgentId],
  messages: [MessageId],
  queue: [AgentId],           // Current raise-hand queue
  recap: {
    summary: String,
    actionItems: [String],
    disagreements: [String],
    mindmapData: Object       // JSON cho React Flow
  },
  createdAt: Date,
  updatedAt: Date
}

// Agent
{
  _id: ObjectId,
  name: String,
  icon: String,
  specialty: String,
  systemPrompt: String,
  personality: Object,        // { directness, creativity, skepticism }
  isCustom: Boolean
}

// Message
{
  _id: ObjectId,
  poolId: ObjectId,
  agentId: ObjectId | "user" | "mindx",
  thinking: String,           // Visible thinking process
  content: String,            // Actual message
  replyTo: ObjectId,          // Thread reference
  mindmapNodeId: String,      // Link to mindmap node
  timestamp: Date
}
```

---

## 12. MVP Roadmap

### Phase 1 — MVP
- [ ] Setup chat interface với MindX
- [ ] MindX gợi ý agents + update agent suggestion inline
- [ ] Pool room với linear feed
- [ ] Raise hand queue cơ bản
- [ ] Visible thinking (expand/collapse)
- [ ] 5 built-in agents + MindX
- [ ] Pool history cơ bản

### Phase 2 — Core Features
- [ ] Mindmap view real-time (React Flow)
- [ ] Split view (Chat + Mindmap)
- [ ] Pool recap auto-generate
- [ ] MindX stop signals đầy đủ (5 signals)
- [ ] User interrupt → MindX pause/resume queue
- [ ] Export mindmap / recap PDF

### Phase 3 — Power Features
- [ ] Custom agent builder
- [ ] Timeline view
- [ ] Agent marketplace
- [ ] Share pool với người khác (read-only link)
- [ ] Mobile responsive

---

## 13. Unique Value Proposition

**Cho cá nhân:**
> "Như có một advisory board riêng — không cần quen biết, không tốn tiền thuê consultant."

**Cho team:**
> "Mọi quyết định quan trọng đều được nhìn từ đủ góc độ trước khi commit."

**Cho người học:**
> "Học cách expert thực sự suy nghĩ — không chỉ đọc kết luận của họ."

---

## 14. Tagline Options

- *"Every perspective. One room."*
- *"Think with experts. Decide with confidence."*
- *"Your ideas deserve a full team."*
- *"Don't think alone."*
- *"The room where good ideas become great decisions."*

---

*Document version: 1.1 — March 2026*
*Project: Mindpool*
