# Mindpool Web — Agent Guidelines

## Stack
React 19 + Vite + TypeScript + Zustand + TailwindCSS + Framer Motion

## Design System
- Dark theme with CSS custom properties (--bg, --surface-1/2/3, --accent, --purple, --amber)
- Fonts: Sora (body), DM Serif Display (titles), JetBrains Mono (code/thinking)
- See `src/index.css` for all CSS variables and animations

## Component Structure
- `screens/` — Full page components (Welcome, Setup, Meeting, History, Settings)
- `components/ui/` — Reusable primitives (Button, Tag, Toggle, Slider)
- `components/chat/` — Chat interface components
- `components/meeting/` — Meeting room components
- `stores/` — Zustand stores (appStore, meetingStore, settingsStore)
- `hooks/` — Custom hooks (useSSE, useMeeting)
- `lib/api.ts` — API client

## Key Patterns
- SSE via EventSource for real-time meeting updates
- Zustand stores as single source of truth
- CSS custom properties for dynamic theming (accent color)
