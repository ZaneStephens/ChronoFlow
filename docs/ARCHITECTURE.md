# ChronoFlow — Architecture Reference

> **Purpose:** Quick-reference for AI coding agents and developers. Covers project structure, data flow, key patterns, and constraints.

---

## 1. What Is ChronoFlow?

A single-page React + TypeScript time-tracking and productivity app built for an MSP IT professional. Designed to run inside a **Microsoft Teams iframe** (deployed via Netlify). Key features:

- 7.6-hour daily goal tracking with 6-minute billing increments
- Kanban task board with AI-generated subtasks (Gemini)
- Visual day timeline with planned activities and recurring rules
- Quarterly Rocks (90-day OKR-style goals)
- Project management with milestones, risks, and AI roadmaps
- Client portfolio management with time distribution
- AI-powered report generation for client status emails
- Focus mode for distraction-free work
- Weekly overview + monthly activity heatmap
- Full data export/import (JSON backup)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI Framework | React 19 | Functional components, hooks only (except ErrorBoundary) |
| Language | TypeScript | Strict mode, all types in `types.ts` |
| Styling | Tailwind CSS (CDN) | Dark slate theme, loaded via `<script>` in index.html |
| Charts | Recharts | Bar charts on Dashboard |
| Icons | Lucide React | Used throughout all components |
| AI | Google Gemini (`@google/genai`) | Subtask generation, report generation, project architecture |
| Build | Vite | Import maps in index.html for CDN resolution |
| Deployment | Netlify | `Netlify.toml` configures SPA redirects |
| Storage | **IndexedDB** (via `storageService.ts`) | Migrated from localStorage; see §5 |

### No node_modules

Dependencies resolve via **import maps** in `index.html` pointing to CDN URLs. There is a `package.json` but `node_modules` may not be installed locally. The TypeScript language server may report spurious "Cannot find module" errors — these do not affect runtime.

---

## 3. File Structure

```
/
├── App.tsx                    # Root component — orchestrates views, modals, timer logic
├── index.tsx                  # ReactDOM.createRoot entry point
├── index.html                 # HTML shell with Tailwind CDN + import maps
├── types.ts                   # ALL TypeScript interfaces and enums
├── vite.config.ts             # Vite config with API_KEY env injection
├── tsconfig.json              # TS config (jsx: react-jsx, bundler resolution)
├── package.json               # Dependency manifest (CDN-resolved)
├── metadata.json              # App metadata
├── Netlify.toml               # Netlify deployment config
├── README.md                  # User-facing README
│
├── components/
│   ├── ClientManager.tsx      # Client CRUD with color picker and details
│   ├── ConfirmModal.tsx       # Reusable confirmation dialog
│   ├── Dashboard.tsx          # Daily goal, stats cards, chart, recent activity
│   ├── ErrorBoundary.tsx      # React error boundary (class component)
│   ├── FloatingTimer.tsx      # Bottom-right active timer indicator
│   ├── FocusMode.tsx          # Distraction-free timer view
│   ├── LandingPage.tsx        # First-run welcome screen
│   ├── PlanModal.tsx          # Create/edit planned activities
│   ├── ProjectManager.tsx     # Project CRUD, milestones, risks, AI architect
│   ├── ReportGenerator.tsx    # AI report generation for clients
│   ├── RockManager.tsx        # Quarterly rocks with key results
│   ├── SearchModal.tsx        # Global search across tasks and sessions
│   ├── SessionModal.tsx       # Stop timer / edit session / manual entry
│   ├── Sidebar.tsx            # Left nav with view switching + export/import
│   ├── TaskBoard.tsx          # Kanban task management + AI subtask generation
│   ├── TaskPreviewModal.tsx   # Quick task preview with subtasks
│   ├── Timeline.tsx           # Day timeline (6AM–6PM) with plans and sessions
│   ├── Toast.tsx              # Toast notifications with undo + progress bar
│   ├── TutorialOverlay.tsx    # Step-by-step onboarding overlay
│   └── WeekView.tsx           # Week overview bars + monthly heatmap
│
├── contexts/
│   ├── DataContext.tsx         # Central data store (clients, projects, tasks, etc.)
│   ├── NotificationContext.tsx # Toast and confirm modal management
│   └── TimerContext.tsx        # Active timer, sessions, finalization logic
│
├── services/
│   ├── geminiService.ts       # Google Gemini AI integration
│   └── storageService.ts      # IndexedDB persistence layer
│
└── docs/
    ├── ARCHITECTURE.md         # This file
    └── AGENT_GUIDE.md          # Operational guide for AI agents
```

---

## 4. Component Architecture

### Provider Hierarchy (App.tsx)

```
<ErrorBoundary>
  <NotificationProvider>     ← Toast + confirm modal state
    <DataProvider>           ← All domain data (clients, tasks, rocks, etc.)
      <TimerProvider>        ← Active timer + sessions (depends on DataProvider)
        <InnerApp />         ← View routing, modals, keyboard shortcuts
      </TimerProvider>
    </DataProvider>
  </NotificationProvider>
</ErrorBoundary>
```

### InnerApp Responsibilities

- **View routing**: Renders the active view based on `ViewMode` enum
- **Modal orchestration**: Manages open/close state for SessionModal, PlanModal, SearchModal, TaskPreviewModal, ImportConfirm, TutorialOverlay
- **Timer bridging**: Handles the stop→modal→finalize flow (context provides raw actions, InnerApp manages the UI flow)
- **Keyboard shortcuts**: `/` opens search, `Escape` closes it
- **Plan reminders**: 30-second interval checks for upcoming planned activities

### Data Flow Pattern

```
User Action → Component callback → InnerApp handler → Context action → setState
                                                                        ↓
                                                              useEffect write-through
                                                                        ↓
                                                                   IndexedDB
```

All data flows through React Context. Components receive data and callbacks as props from InnerApp (which destructures from context hooks). No component reads from storage directly.

---

## 5. Storage Architecture

### IndexedDB (`storageService.ts`)

| Store Name | Content | Growth Pattern |
|-----------|---------|---------------|
| `clients` | Client[] | Low (tens) |
| `projects` | Project[] | Low (tens) |
| `customTemplates` | ProjectTemplate[] | Low |
| `rocks` | Rock[] | Low (quarterly) |
| `tasks` | Task[] | Medium (hundreds over time) |
| `subtasks` | Subtask[] | Medium |
| `plannedActivities` | PlannedActivity[] | Medium (daily) |
| `recurringActivities` | RecurringActivity[] | Low |
| `sessions` | TimerSession[] | **High** (multiple per day, never pruned) |
| `activeTimer` | ActiveTimer \| null | Single value |
| `_meta` | Migration flags | Internal |

### Migration from localStorage

On first app load, `migrateFromLocalStorage()` runs:
1. Checks `_meta.migrated` flag in IndexedDB
2. If not migrated: reads all localStorage keys, writes to IndexedDB stores, marks complete
3. Removes old localStorage keys (keeps `hasSeenTutorial` — a UI flag)

This is called in the `App` component before providers mount, gated by a loading spinner.

### Hydration Flow

1. `App` calls `migrateFromLocalStorage()` → shows "Initializing storage..." spinner
2. Once complete, providers mount
3. `DataProvider` and `TimerProvider` each run parallel `getStore()` calls in `useEffect`
4. States populated → `isLoading` set to `false`
5. `InnerApp` checks `dataLoading || timerLoading` → shows "Loading ChronoFlow..." until ready
6. App renders normally

### Write-Through

Each context has per-store `useEffect` hooks that call `setStore()` whenever state changes. A `isHydrated` ref prevents the initial empty-array states from overwriting real data before hydration completes.

---

## 6. Timer System

### 6-Minute Billing Blocks

All timer sessions are rounded UP to the nearest 6-minute (360-second) block. A 1-minute timer produces a 6-minute session. This is MSP billing standard.

### Timer Flow

```
User clicks Start → handleStartTimer()
  ├── If no active timer: startTimer() in context
  └── If active timer running:
      ├── Set pendingTimerStart (task to start next)
      └── localStopRequest(currentTimer)
          ├── If subtask: auto-finalize (no modal)
          └── If task: open SessionModal in 'stop' mode
              └── User saves → finalizeSession() → activeTimer becomes null
                  └── useEffect detects pendingTimerStart + null timer → startTimer()
```

### Session Modes (SessionModal)

| Mode | Trigger | Behavior |
|------|---------|----------|
| `stop` | Stopping active timer | Timer data pre-filled, user adds notes |
| `edit` | Clicking an existing session | Full edit of all fields |
| `create` | Manual entry or project time log | Creates new session from scratch |
| `log-plan` | Logging a planned task activity | Creates session from plan data |

---

## 7. Key Types (`types.ts`)

### ViewMode Enum
`DASHBOARD | PROJECTS | ROCKS | TASKS | CLIENTS | TIMELINE | REPORTS | FOCUS`

### Core Entities
- **Client**: `{ id, name, color, contactName?, contactEmail?, services?, isInternal? }`
- **Task**: `{ id, clientId, projectId?, title, description, ticketNumber?, status, totalTime, createdAt, link? }`
- **Subtask**: `{ id, taskId, title, isCompleted, totalTime, link? }`
- **TimerSession**: `{ id, taskId?, subtaskId?, clientId?, projectId?, milestoneId?, customTitle?, startTime, endTime?, notes?, isManualLog? }`
- **ActiveTimer**: `{ taskId?, subtaskId?, startTime }`
- **PlannedActivity**: `{ id, date, startTime, durationMinutes, type, taskId?, clientId?, quickTitle?, isLogged, recurringId? }`
- **RecurringActivity**: `{ id, startDate, type, taskId?, clientId?, quickTitle?, startTimeStr, durationMinutes, frequency, weekDays?, monthDay?, nthWeek?, nthWeekDay? }`
- **Project**: `{ id, title, clientId, description, status, startDate, dueDate?, milestones[], risks[], tags? }`
- **Rock**: `{ id, title, description, status, quarter, keyResults[], createdAt }`

---

## 8. AI Integration (`geminiService.ts`)

Uses `@google/genai` with API key injected via Vite's `define` (`process.env.API_KEY`).

### Capabilities

| Function | Purpose | Used In |
|----------|---------|---------|
| `generateSubtasks()` | Break down task into 3–6 subtasks | TaskBoard |
| `generateReport()` | Client status email or technical breakdown | ReportGenerator |
| `architectProject()` | Generate milestones + risks for a project | ProjectManager |
| `refineRock()` | Convert vague rock into SMART format with KRs | RockManager |

All functions include MSP context (internal vs external client) and use structured JSON output schemas.

---

## 9. Runtime Constraints

### Microsoft Teams Iframe

The app runs inside Teams as an embedded tab. This means:

| Constraint | Impact |
|-----------|--------|
| `Notification.requestPermission()` | **Will not work.** Use in-app toasts only. |
| `Ctrl+K` keyboard shortcut | **Conflicts with Teams command bar.** Use `/` for search instead. |
| `window.open()` | May be blocked. Avoid pop-ups. |
| `document.cookie` | Limited. Use IndexedDB/localStorage. |
| Cross-origin restrictions | Import maps resolve to CDN — works fine. |

### No Server / No Auth

- All data is local to the browser profile
- No user accounts, no sync
- Backup/restore is via JSON export/import

---

## 10. Styling Conventions

- **Color palette**: Slate-900 background, Slate-800 cards, Indigo-500/600 primary, Emerald for success, Amber for warning, Rose/Red for danger
- **Padding**: All main views have `p-6` on their root container
- **Cards**: `bg-slate-800 border border-slate-700 rounded-xl p-6`
- **Buttons (primary)**: `bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg`
- **Buttons (ghost)**: `text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg`
- **Font**: Inter (system-ui fallback) via Tailwind config
- **Labels**: `text-[10px] uppercase tracking-wider text-slate-500 font-bold` for stat labels

---

## 11. Known Quirks & Tech Debt

1. **`stopTimerRequest` in TimerContext** is a no-op placeholder (`() => {}`). The actual stop flow is orchestrated in `InnerApp`.
2. **tsconfig `types: ["node"]`** limits type resolution. Combined with no `node_modules`, the TS language server may show false "Cannot find module" errors. These don't affect runtime (CDN import maps handle resolution).
3. **Session `totalTime` duplication**: Both `Task.totalTime` and `Subtask.totalTime` are maintained as running sums, updated on session create/update/delete. This denormalization is intentional for performance but means the values can drift if bugs occur in the update logic.
4. **Planned activity rollover**: Uncompleted, non-recurring planned activities from past dates are auto-moved to today during DataContext hydration.
5. **Ghost plans**: Recurring activities generate "ghost" plans (IDs starting with `ghost_`) that are materialized into real PlannedActivity records when interacted with.
