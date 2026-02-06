# ChronoFlow — AI Agent Operational Guide

> **Audience:** AI coding agents (Copilot, Claude, etc.) working on this codebase.  
> **Companion doc:** `ARCHITECTURE.md` — read that first for structure and data flow.

---

## Quick Start Checklist

Before making changes, verify:

1. **Read `types.ts`** — all interfaces are defined here. Never create types inline.
2. **Read the target component's props interface** — props are passed from `App.tsx`, not from context hooks (except rare cases).
3. **Check `App.tsx`** (~870 lines) — this is the orchestration layer. All view rendering, modal state, and handler wiring lives here.
4. **No `node_modules`** — dependencies load via CDN import maps in `index.html`. TS "Cannot find module" errors are false positives.
5. **IndexedDB, not localStorage** — all persistence is through `services/storageService.ts`. Do NOT add new `localStorage` calls.

---

## File Modification Decision Tree

```
Need to add a new data entity?
  → Add interface to types.ts
  → Add state + CRUD actions to DataContext.tsx
  → Add StoreName to storageService.ts STORE_NAMES array
  → Add store creation in openDB() onupgradeneeded
  → Add hydration + write-through in DataContext.tsx
  → Wire props through App.tsx to consuming component

Need to add a new view/page?
  → Add value to ViewMode enum in types.ts
  → Create component in components/
  → Add nav item in Sidebar.tsx
  → Add render block in App.tsx (inside the view switch)
  → Add p-6 padding to the component's root container

Need to modify component props?
  → Update the component's Props interface
  → Update the JSX in App.tsx where the component is rendered
  → Run get_errors to verify alignment

Need to add a new modal?
  → Create component in components/
  → Add open/close state in InnerApp (App.tsx)
  → Add render block after the main content area in App.tsx
  → Use conditional rendering pattern (not isOpen prop) when possible
```

---

## Critical Patterns to Follow

### 1. Context → Props → Component

Components do **not** call `useData()` or `useTimer()` directly (with rare exceptions like ProjectManager/RockManager which receive `requestConfirm`/`showToast` as props). Instead:

```
InnerApp (App.tsx)
  ├── const { tasks, addTask, ... } = useData();
  ├── const { sessions, startTimer, ... } = useTimer();
  └── <TaskBoard tasks={tasks} onAddTask={addTask} ... />
```

**Why:** Keeps components pure and testable. The InnerApp is the single point of context consumption.

### 2. Storage Write-Through

```typescript
// In DataContext.tsx / TimerContext.tsx:
const isHydrated = useRef(false);

// Hydrate on mount
useEffect(() => {
    getStore<T[]>('storeName').then(data => {
        setState(data ?? defaults);
        isHydrated.current = true;
    });
}, []);

// Write on every change (skip until hydrated)
useEffect(() => {
    if (!isHydrated.current) return;
    setStore('storeName', stateValue).catch(console.error);
}, [stateValue]);
```

**Critical:** Always guard writes with `isHydrated.current` to prevent empty defaults from overwriting real data before IndexedDB has loaded.

### 3. Timer Chaining via useEffect

When switching from one timer to another (start new while one is running):

```typescript
const [pendingTimerStart, setPendingTimerStart] = useState<{...} | null>(null);

useEffect(() => {
    if (!activeTimer && pendingTimerStart) {
        startTimer(pendingTimerStart.taskId, pendingTimerStart.subtaskId);
        setPendingTimerStart(null);
    }
}, [activeTimer, pendingTimerStart]);
```

**Why:** `finalizeSession()` sets `activeTimer` to `null` asynchronously. The `useEffect` waits for that state change before starting the next timer.

### 4. Ghost Plans (Recurring Activities)

Recurring activities are stored as rules in `recurringActivities[]`. The Timeline renders "ghost" representations with IDs like `ghost_{ruleId}_{dateKey}`. When a user interacts with a ghost (edit, log, drag), it gets **materialized** into a real `PlannedActivity` with a generated ID. Always check for `id.startsWith('ghost_')` before CRUD operations.

### 5. Session 6-Minute Rounding

Timer sessions round UP to the nearest 6-minute block:

```typescript
const SIX_MINUTES_MS = 6 * 60 * 1000;
let blocks = Math.ceil(rawDuration / SIX_MINUTES_MS);
if (blocks < 1) blocks = 1;
const roundedDuration = blocks * SIX_MINUTES_MS;
```

This is a core business rule. Never change or bypass it.

---

## Common Pitfalls

### ❌ Adding localStorage calls
All persistence goes through `storageService.ts`. The only remaining localStorage usage is `hasSeenTutorial` (a UI flag in App.tsx).

### ❌ Using Ctrl+ keyboard shortcuts
The app runs in a Teams iframe. `Ctrl+K`, `Ctrl+P`, etc. are intercepted by Teams. Use single-key shortcuts only (`/`, `Escape`), guarded by input focus checks.

### ❌ Using browser Notification API
`Notification.requestPermission()` fails in iframes. Use `showToast()` from `useNotification()` for all user alerts.

### ❌ Modifying component props without updating App.tsx
Every prop change must be mirrored in the JSX call site in App.tsx. Use `get_errors` after any prop interface change to catch mismatches.

### ❌ Creating new type definitions inline
All types go in `types.ts`. The only exception is component-local prop interfaces (defined in the component file itself).

### ❌ Forgetting `p-6` on new views
Every main view component must have `p-6` (or equivalent padding) on its root container element. Without it, content touches the sidebar edge.

---

## How to Add Common Features

### Add a new data field to an existing entity

1. Update the interface in `types.ts`
2. The field is automatically persisted (IndexedDB stores full objects)
3. Update components that display/edit the entity
4. If the field needs default values for existing data, handle it in the hydration logic of `DataContext.tsx`

### Add undo support to a delete action

```typescript
// In App.tsx handler:
const handleDeleteThing = (id: string) => {
    const snapshot = things.find(t => t.id === id);
    deleteThing(id);
    if (snapshot) {
        showToast('Deleted', 'success', () => addThing(snapshot));
    }
};
```

The third argument to `showToast()` is the undo callback. The Toast component shows an Undo button with an 8-second countdown.

### Add a new AI feature

1. Add the function in `services/geminiService.ts`
2. Include MSP context via `getMspContext(isInternal, clientName)`
3. Use structured output schemas (`responseMimeType: 'application/json'` + `responseSchema`)
4. Call it from the component (AI calls are one of the few places components may have side effects)

---

## Testing & Verification

### No test framework is set up. Verify changes by:

1. **`get_errors`** — Check all modified files for TypeScript errors
2. **Prop alignment** — After any interface change, verify App.tsx passes correct props
3. **Storage round-trip** — New data fields should survive a page refresh
4. **Teams constraints** — No Ctrl+ shortcuts, no Notification API, no window.open

### Known false positives

The TS language server may report `Cannot find module 'react'` or `Cannot find module 'lucide-react'` on files it hasn't cached yet. These are caused by:
- `tsconfig.json` having `"types": ["node"]` which limits type resolution
- No `node_modules` directory (CDN import maps handle runtime resolution)

These errors do **not** affect the built application.

---

## File Size Reference

Large files that require careful navigation:

| File | Lines | Notes |
|------|-------|-------|
| `App.tsx` | ~870 | Orchestration hub — read in sections |
| `TaskBoard.tsx` | ~765 | Kanban board — complex drag/filter logic |
| `ProjectManager.tsx` | ~1050 | Three sub-views: list, create, detail |
| `Timeline.tsx` | ~575 | Day timeline with drag-to-move, zoom |
| `RockManager.tsx` | ~616 | Three sub-views: list, create, detail |
| `geminiService.ts` | ~423 | Four AI functions with long prompts |

---

## Storage Capacity Reference

| Storage Type | Typical Limit | ChronoFlow Use |
|-------------|--------------|----------------|
| localStorage | 5–10 MB | **No longer used** (migrated) |
| IndexedDB | 50%+ of disk | Primary storage — effectively unlimited |
| Import map CDN | N/A | Dependencies loaded from aistudiocdn.com |

### Session Growth Estimate

At ~3–5 sessions/day × 365 days × ~200 bytes/session = **~365 KB/year**. IndexedDB handles this comfortably for decades of use. If performance ever becomes a concern, consider archiving sessions older than N months to a separate store.

---

## Context Provider Quick Reference

### DataContext (`useData()`)

**State:** `clients`, `projects`, `tasks`, `subtasks`, `rocks`, `plannedActivities`, `recurringActivities`, `customTemplates`, `isLoading`

**Actions:** `add*`, `update*`, `delete*` for each entity, plus `importData(data, strategy)`

### TimerContext (`useTimer()`)

**State:** `activeTimer`, `sessions`, `isLoading`

**Actions:** `startTimer`, `cancelActiveTimer`, `finalizeSession`, `addSession`, `updateSession`, `deleteSession`, `importSessionData`

### NotificationContext (`useNotification()`)

**State:** (internal only — managed by provider)

**Actions:** `showToast(message, type?, onUndo?)`, `requestConfirm(message, onConfirm)`
