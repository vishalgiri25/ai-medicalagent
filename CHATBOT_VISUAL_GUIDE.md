# 🎨 Chatbot Implementation - Visual Guide

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐    ┌────────────────────┐   │
│  │  Session Page        │    │  Any Page          │   │
│  │  /medical-agent/[id] │    │  /dashboard, etc.  │   │
│  │                      │    │                    │   │
│  │  [Voice] [Chat]      │    │        💬          │   │
│  │                      │    │   (Floating)       │   │
│  │  ┌────────────────┐ │    │                    │   │
│  │  │  ChatBot       │ │    │  ┌──────────────┐ │   │
│  │  │  Component     │ │    │  │ FloatingChat │ │   │
│  │  └────────────────┘ │    │  │  Component   │ │   │
│  └──────────────────────┘    │  └──────────────┘ │   │
│           │                   │         │          │   │
└───────────┼───────────────────┼─────────┼──────────────┘
            │                   │         │
            ▼                   │         ▼
   ┌────────────────┐          │  ┌──────────────┐
   │ /api/          │          │  │ /api/        │
   │ chat-message   │          │  │ general-chat │
   │                │          │  │              │
   │ • POST/GET     │          │  │ • POST       │
   │ • Session-based│          │  │ • Standalone │
   └────────┬───────┘          │  └──────┬───────┘
            │                   │         │
            └───────────────────┴─────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   OpenAI API          │
            │   GPT-4o-mini         │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Database            │
            │   (SessionChatTable)  │
            └───────────────────────┘
```

---

## 🔄 Data Flow

### Session Chat Flow

```
User Types Message
      │
      ▼
ChatBot Component
      │
      ├─ Add to UI immediately
      │
      ▼
POST /api/chat-message
      │
      ├─ Validate user auth
      ├─ Check session ownership
      ├─ Load conversation history
      │
      ▼
OpenAI API Call
      │
      ├─ System prompt (doctor context)
      ├─ Conversation history
      ├─ User message
      │
      ▼
AI Response Generated
      │
      ├─ Save to database
      │
      ▼
Return to Frontend
      │
      ▼
Display in Chat UI
```

### Floating Chat Flow

```
User Clicks Button
      │
      ▼
FloatingChatBot Opens
      │
      ▼
User Types Message
      │
      ▼
POST /api/general-chat
      │
      ├─ Validate auth
      ├─ Build conversation context
      │
      ▼
OpenAI API Call
      │
      ├─ General medical prompt
      ├─ Recent conversation
      │
      ▼
AI Response Generated
      │
      ▼
Display in Widget
      │
(Not saved to database)
```

---

## 📁 File Relationships

```
app/
├── (routes)/
│   └── dashboard/
│       └── medical-agent/
│           └── [sessionId]/
│               └── page.tsx
│                   │
│                   ├─ Imports: ChatBot
│                   ├─ Uses: /api/chat-message
│                   └─ State: chatMode, chatMessages
│
├── api/
│   ├── chat-message/
│   │   └── route.ts
│   │       ├─ POST: Send message
│   │       ├─ GET: Load history
│   │       └─ Saves to: SessionChatTable.conversation
│   │
│   └── general-chat/
│       └── route.ts
│           ├─ POST: Send message
│           └─ No database (stateless)
│
components/
├── ChatBot.tsx
│   ├─ Props: sessionId, doctorName, initialMessages
│   ├─ Uses: /api/chat-message
│   └─ Features: History, keyboard shortcuts, auto-scroll
│
└── FloatingChatBot.tsx
    ├─ Props: None (self-contained)
    ├─ Uses: /api/general-chat
    └─ Features: Floating UI, expandable, minimal
```

---

## 🎭 Component States

### ChatBot Component

```typescript
State Management:
┌──────────────────────────────────┐
│ messages: Message[]              │ ← Conversation history
├──────────────────────────────────┤
│ input: string                    │ ← Current user input
├──────────────────────────────────┤
│ isLoading: boolean               │ ← Waiting for AI?
├──────────────────────────────────┤
│ messagesEndRef                   │ ← For auto-scroll
└──────────────────────────────────┘

Message Type:
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: Date
}
```

### Medical Agent Page

```typescript
New State Added:
┌──────────────────────────────────┐
│ chatMode: 'voice' | 'text'       │ ← Current mode
├──────────────────────────────────┤
│ chatMessages: Message[]          │ ← Text chat history
└──────────────────────────────────┘

Existing State:
┌──────────────────────────────────┐
│ messages: messages[]             │ ← Voice transcripts
├──────────────────────────────────┤
│ callStarted: boolean             │ ← Voice call status
├──────────────────────────────────┤
│ sessionDetail                    │ ← Session info
└──────────────────────────────────┘
```

---

## 🎨 UI Components Layout

### Session Chat Interface

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👨‍⚕️ Cardiologist           [Voice][Chat]┃ ← Header
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                          ┃
┃  ┌─────────────────────┐                ┃
┃  │ User Message        │                ┃
┃  │ (bg-primary)        │                ┃
┃  └─────────────────────┘                ┃
┃                                          ┃
┃           ┌──────────────────────────┐  ┃
┃           │ Assistant Message        │  ┃
┃           │ (bg-muted)               │  ┃
┃           └──────────────────────────┘  ┃
┃                                          ┃
┃  ┌─────────────────────┐                ┃
┃  │ User Message        │                ┃
┃  └─────────────────────┘                ┃
┃                                          ┃
┃           ┌──────────────────────────┐  ┃
┃           │ Thinking...              │  ┃
┃           │ (animated)               │  ┃
┃           └──────────────────────────┘  ┃
┃                                          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ [Type message...]            [Send ➤]  ┃ ← Input
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Floating Chat Widget

```
                    ┏━━━━━━━━━━━━━━━┓
                    ┃ 🤖 Medical   [X]┃
                    ┣━━━━━━━━━━━━━━━┫
                    ┃                ┃
                    ┃ Welcome! How   ┃
                    ┃ can I help?    ┃
                    ┃                ┃
                    ┃  ┌──────────┐ ┃
                    ┃  │ Hi...    │ ┃
                    ┃  └──────────┘ ┃
                    ┃                ┃
                    ┃     ┌───────┐ ┃
                    ┃     │Reply  │ ┃
                    ┃     └───────┘ ┃
                    ┃                ┃
                    ┣━━━━━━━━━━━━━━━┫
                    ┃ [Type] [Send] ┃
                    ┗━━━━━━━━━━━━━━━┛
                              ▲
                              │
                    Position: fixed
                    bottom-6 right-6
```

---

## 🔄 Mode Toggle Behavior

```
┌─────────────────────────────────────────┐
│ Initial State: Voice Mode               │
├─────────────────────────────────────────┤
│ [Voice] [Chat] ← Toggle buttons         │
│   ✓              (grayed out)           │
├─────────────────────────────────────────┤
│ • Call button visible                   │
│ • Voice transcript display              │
│ • VAPI integration active               │
└─────────────────────────────────────────┘
                    │
                    ▼ Click "Chat"
┌─────────────────────────────────────────┐
│ New State: Chat Mode                    │
├─────────────────────────────────────────┤
│ [Voice] [Chat] ← Toggle buttons         │
│ (grayed)  ✓                             │
├─────────────────────────────────────────┤
│ • Call button hidden                    │
│ • ChatBot component renders             │
│ • Load conversation history             │
│ • Voice features disabled               │
└─────────────────────────────────────────┘
```

---

## 💬 Message Types

### User Message Bubble

```css
Style:
- Position: right-aligned (justify-end)
- Background: bg-primary
- Text: text-primary-foreground
- Max Width: 80%
- Border Radius: rounded-2xl
- Shadow: shadow-sm
```

```tsx
<div className="flex justify-end">
  <div
    className="max-w-[80%] rounded-2xl bg-primary 
                  text-primary-foreground p-4 shadow-sm"
  >
    <p>User message here</p>
  </div>
</div>
```

### Assistant Message Bubble

```css
Style:
- Position: left-aligned (justify-start)
- Background: bg-muted
- Text: text-foreground
- Max Width: 80%
- Border Radius: rounded-2xl
- Shadow: shadow-sm
```

```tsx
<div className="flex justify-start">
  <div
    className="max-w-[80%] rounded-2xl bg-muted 
                  text-foreground p-4 shadow-sm"
  >
    <div className="flex items-center gap-2 mb-2">
      <Bot className="h-4 w-4" />
      <p className="text-xs font-medium">Cardiologist</p>
    </div>
    <p>Assistant response here</p>
  </div>
</div>
```

### Loading State

```tsx
<div className="flex justify-start">
  <div className="rounded-2xl bg-muted p-4">
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <p className="text-sm">Thinking...</p>
    </div>
  </div>
</div>
```

---

## 🎯 Integration Points

### Where to Add Floating Chat

```typescript
// Option 1: Dashboard only
// File: app/(routes)/dashboard/page.tsx
import { FloatingChatBot } from "@/components/FloatingChatBot";

function DashboardContent() {
  return (
    <div>
      {/* Existing content */}
      <FloatingChatBot />
    </div>
  );
}

// Option 2: All authenticated pages
// File: app/(routes)/layout.tsx
import { FloatingChatBot } from "@/components/FloatingChatBot";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <FloatingChatBot />
    </>
  );
}

// Option 3: Root layout (entire app)
// File: app/layout.tsx
import { FloatingChatBot } from "@/components/FloatingChatBot";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <FloatingChatBot />
      </body>
    </html>
  );
}
```

---

## 🔐 Security Flow

```
Request Received
      │
      ▼
┌─────────────────────┐
│ Check Auth          │
│ (Clerk)             │
└─────┬───────────────┘
      │
      ├─ Not authenticated ─→ 401 Unauthorized
      │
      ▼
┌─────────────────────┐
│ Get User Email      │
└─────┬───────────────┘
      │
      ▼
┌─────────────────────┐
│ Validate Session    │
│ (if applicable)     │
└─────┬───────────────┘
      │
      ├─ Session not found ─→ 404 Not Found
      │
      ▼
┌─────────────────────┐
│ Check Ownership     │
│ (session.createdBy) │
└─────┬───────────────┘
      │
      ├─ Not owner ─→ 403 Forbidden
      │
      ▼
┌─────────────────────┐
│ Process Request     │
│ (call OpenAI, etc.) │
└─────────────────────┘
```

---

## 📊 Database Structure

```sql
SessionChatTable {
  id: integer (PK)
  sessionId: varchar
  notes: text
  selectedDoctor: json
  conversation: json ← Chat messages stored here
  report: json
  uploadedReports: json
  createdBy: varchar (FK → users.email)
  createdOn: varchar
}

conversation field format:
[
  {
    "role": "user",
    "content": "Message text",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  {
    "role": "assistant",
    "content": "Response text",
    "timestamp": "2024-01-15T10:30:05Z"
  }
]
```

---

## 🎨 Styling System

```
Theme Variables (from globals.css):
┌────────────────────────────────┐
│ --primary: Your primary color  │
│ --muted: Gray/neutral tone     │
│ --card: Card background        │
│ --foreground: Text color       │
└────────────────────────────────┘

Tailwind Classes Used:
• bg-primary → Primary color
• bg-muted → Subtle background
• text-foreground → Main text
• rounded-2xl → Rounded corners
• shadow-sm/md/lg → Shadows
• animate-pulse/spin → Animations
```

---

## 🚀 Performance Optimizations

```
Frontend:
├─ Auto-scroll only on message change
├─ Debounced textarea resize
├─ Conditional rendering (voice vs chat)
└─ Lazy load conversation history

API:
├─ Validate inputs early
├─ Reuse conversation context
├─ Set token limits (max_tokens)
└─ Error handling at each step

Database:
├─ Single update per conversation
├─ JSON field for flexibility
└─ Index on sessionId
```

---

## 📱 Responsive Design

```
Mobile (< 768px):
┌─────────────────┐
│ Header (stack)  │
│ ┌─────────────┐ │
│ │ Mode Toggle │ │
│ └─────────────┘ │
├─────────────────┤
│ Chat Area       │
│ (full width)    │
├─────────────────┤
│ Input (stack)   │
└─────────────────┘

Desktop (> 768px):
┌────────────────────────────┐
│ Header (row)               │
│ Doctor | Mode | Actions    │
├────────────────────────────┤
│ Chat Area (wider)          │
├────────────────────────────┤
│ Input (row with send btn)  │
└────────────────────────────┘
```

---

This visual guide shows how all components work together! 🎨
