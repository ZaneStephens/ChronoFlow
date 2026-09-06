# ChronoFlow IT

A local-first time tracking and productivity app built for MSP IT professionals. Track billable hours in 6-minute increments, manage clients, plan your day, and generate AI-powered reports — all inside Microsoft Teams.

## Workspace redesign

The redesigned workspace centres on daily priorities, a searchable task board, project milestones and a dedicated focus space. See [docs/REDESIGN.md](docs/REDESIGN.md) for the review findings, compatibility contract and verification limits.

## Features

- **7.6h Daily Goal** — Visual progress tracking with stat cards and charts
- **6-Minute Billing** — Timer sessions auto-round to MSP-standard 6-minute blocks
- **Task Board** — Searchable board and list layouts with client filters, status controls and subtasks
- **AI Subtasks** — Break down tickets into actionable steps with Google Gemini
- **Day Timeline** — 6AM–6PM visual planner with drag-to-move and recurring activities
- **Week Overview** — Seven-day logged-hours chart in the daily overview
- **Daily Overview** — Next actions, recent sessions and client time distribution
- **Project Management** — Milestones, risks, and AI-generated roadmaps
- **Quarterly Goals** — Searchable rocks with quarter filters, key results and manual or AI-assisted creation
- **Client Portfolio** — Color-coded clients with contact details and service agreements
- **AI Reports** — Generate professional status emails or technical breakdowns
- **Focus Mode** — Distraction-free timer view
- **Global Search** — Find tasks, sessions, projects, and rocks instantly
- **Export / Import** — Full JSON backup and restore
- **Undo on Delete** — 8-second undo window for deleted sessions

## Tech Stack

|                |                                                 |
| -------------- | ----------------------------------------------- |
| **Frontend**   | React 19, TypeScript                            |
| **Styling**    | Compiled Tailwind CSS + workspace design tokens |
| **Charts**     | Recharts                                        |
| **Icons**      | Lucide React                                    |
| **AI**         | Google Gemini (`@google/genai`)                 |
| **Storage**    | IndexedDB (auto-migrated from localStorage)     |
| **Build**      | Vite                                            |
| **Deployment** | Netlify → Microsoft Teams iframe                |

## Running Locally

**Prerequisites:** Node.js

```bash
npm install
```

Set your Gemini API key in the Netlify environment variables:

```
API_KEY=your_gemini_api_key
```

The key is read only by the Netlify Function at runtime and is never included in the browser bundle. For local AI development, use `netlify dev` so the `/api/gemini` route and environment variables are available.

Start the frontend (AI actions need `netlify dev`):

```bash
npm run dev
```

Validate the project:

```bash
npm run typecheck
npm test
npm run build
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical reference.

For AI agents working on this codebase, see [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md).

### Key Concepts

- **Context-driven state** — Three React Context providers (Data, Timer, Notification) manage all state
- **IndexedDB persistence** — All data stored locally in IndexedDB via `services/storageService.ts` with automatic migration from localStorage
- **Teams-safe** — No browser Notification API, no Ctrl+ shortcuts, no popups
- **6-minute rounding** — Core billing logic rounds all sessions up to nearest 6-minute block

## Project Structure

```
├── App.tsx                     # Root orchestration (views, modals, shortcuts)
├── types.ts                    # All TypeScript interfaces and enums
├── components/                 # UI components (18 files)
├── contexts/                   # React Context providers (3 files)
├── services/
│   ├── geminiService.ts        # Browser client for the AI function
│   └── storageService.ts       # IndexedDB persistence layer
├── netlify/functions/
│   └── gemini.mts              # Server-side Google Gemini integration
└── docs/
    ├── ARCHITECTURE.md         # Technical architecture reference
    └── AGENT_GUIDE.md          # AI agent operational guide
```

## License

Private project. All rights reserved.
