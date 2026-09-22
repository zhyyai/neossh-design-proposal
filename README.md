# ◢◤ NEOSSH — Post-Bastion Operations Fabric

A zero-dependency-web-facing, GPU-rendered SSH operations console.
Real PTY terminals, keystroke forensics, session replay, tunnel
cartography and command broadcast — everything a bastion host does,
distilled into one Next.js application. 中文界面一键切换 · 白天/黑夜双主题 · 四款等宽字体。

---

## Quick start

```bash
cp .env.example .env          # point DATABASE_URL at PostgreSQL
npm install                   # node-pty compiles natively
npx drizzle-kit push          # create tables
npm run build && npm start    # production
# open http://localhost:3000
```

First request seeds the demo inventory (hosts, snippets, tunnels,
audit entries) automatically via `src/db/seed.ts`.

## Feature map

| Surface | What it does |
|---|---|
| `/` | Cyberpunk landing — Matrix rain, glitch typography, auto-typing demo terminal, animated footprint comparison |
| `/terminal` | Real `node-pty` bash sessions over SSE+POST (WebSocket-free for proxy resilience): multi-tab, WebGL render, **command broadcast**, 5 terminal themes, font size/family hot-swap, snippet loader, sandbox filesystem explorer |
| `/dashboard` | Live KPIs, 7-day command-velocity chart, live channel polling, `/proc` node telemetry (CPU/mem/disk/load) |
| `/hosts` | Host inventory CRUD with groups, tags, signal colors, one-click LINK |
| `/audit` | Keystroke-level command log with SAFE/WARN/DANGER risk classification + session link records |
| `/replays` | Timestamped takes sealed automatically when a channel closes; timeline player with 0.5×–8× speed and frame-precise scrub |
| `/snippets` | Command armory with blast-radius flags and usage ranking |
| `/tunnels` | SVG network cartography with animated flow lines, power/cut control |
| `⌘K` anywhere | Global command palette — hosts, snippets, actions |

Global prefs (top right of every page): **中/EN** language, **light/dark** mode,
terminal font (JetBrains Mono / IBM Plex Mono / Fira Code / System).
Persisted in `localStorage`, applied flash-free via an inline boot script.

## Architecture

```
Browser ──SSE──▶ Next.js route handlers ──▶ node-pty (real bash PTYs)
   │                    │
   └──POST──input/resize┴──▶ PostgreSQL (hosts, sessions, command_logs,
                                          snippets, tunnels, recordings)
```

- `src/lib/pty-manager.ts` — session registry: ring-buffer replay, risk
  engine, keystroke capture, GC of dead channels.
- `src/app/api/terminal/stream` — SSE carrier, base64 chunks, replay-on-attach.
- `src/app/api/fs` — sandbox filesystem bridge. Mutations deny-list
  `/proc /sys /dev /run /etc /boot /usr`.
- `src/app/api/metrics` — agentless telemetry from `/proc`.
- `src/lib/prefs.tsx` — language/mode/font preference store + dictionary.

## Security notes

- Risk engine classifies commands in-flight (fork bombs, disk writers,
  permission wipes, pipe-to-shell) and seals a forensic trail per session.
- All SQL is parameterized via Drizzle ORM; raw ANSI data is stored as JSON
  text and only ever rendered into xterm (never as HTML).
- This build exposes no auth layer by design (single-operator sandbox
  model) — put it behind your SSO/reverse proxy before exposing it.

## Scripts

```bash
npm run dev        # develop
npm run build      # production build
npm start          # serve
npm run lint       # eslint (react-hooks strict rules included)
npm run typecheck  # tsc --noEmit
```

## Stack

Next.js 16 (App Router) · React 19 · node-pty · xterm.js + WebGL addon ·
PostgreSQL + Drizzle ORM · Tailwind CSS 4 · Framer Motion · lucide-react
