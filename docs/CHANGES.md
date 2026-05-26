# ChronoFlow — Documented Changes & Code Review

This document summarizes the changes made to the ChronoFlow codebase following the initial implementation plan and the comprehensive code review.

---

## 1. Pasting Sanitisation & Rich Text Cleanup
- **File:** [SessionModal.tsx](file:///f:/Application%20Projects/ChronoFlow/components/SessionModal.tsx)
- **Implementation:**
  - Added a custom `handlePaste` event listener to the `contentEditable` description editor. It intercepts pastes, extracts the plain text from the clipboard, and inserts it at the current text cursor position using `window.getSelection()`.
  - Added `sanitizeNotes()` which dynamically replaces all non-breaking space `&nbsp;` characters with normal spaces (` `).
  - Wrapped `notes` state updates in `onInput`, `onBlur`, and `handleFormat` with the `sanitizeNotes` helper to prevent HTML entities from corrupting note contents.
- **Impact:** Prevents foreign style leakage (colors, fonts, sizes) when copy-pasting from Teams or external websites into the editor, and completely resolves the space-to-`&nbsp;` string corruption issue.

---

## 2. Fuzzy Client Mapping for Quick Entry
- **File:** [SessionModal.tsx](file:///f:/Application%20Projects/ChronoFlow/components/SessionModal.tsx)
- **Implementation:**
  - Created a robust fuzzy matching helper `matchClientFromText()` using a three-tier prioritized match ladder:
    1. **Exact/Substring Match:** Matches if the lowercase text contains the full client name.
    2. **Acronym Match:** Generates a multi-word client's acronym (e.g. "Oranga Tamariki" -> "OT") and checks if the text contains that acronym as a standalone token.
    3. **Significant Word Match:** Filters out standard English/business stop words (e.g. `the`, `and`, `limited`, `ltd`) and checks if any significant client name word is present in the description.
  - Wired a `useEffect` hook that runs when description notes are entered: if the user is in "Quick Entry" allocation and no client has been selected yet, it automatically matches and pre-selects the client.
- **Impact:** Speeds up the stopping/logging workflow by automatically selecting the correct client as soon as a description is typed or pasted.

---

## 3. Enhanced Analytics: Client Insights & Pain Points
- **File:** [Dashboard.tsx](file:///f:/Application%20Projects/ChronoFlow/components/Dashboard.tsx)
- **Implementation:**
  - Added an interactive **Client Insights & Pain Points** section at the bottom of the Dashboard page.
  - Implemented a dropdown to select a client (or view "All Clients").
  - **Most Time-Consuming Tasks:** Analyzes and lists the client's tasks ranked by tracked hours.
  - **Notes Keyword Distribution:** Strips HTML and analyzes session descriptions to find common action keywords (e.g., "Review", "Azure", "Email", "Migration") and graphs the total time spent on each.
  - **Pain Points Warning Badges (MSP-Specific):**
    - **Micro-tasking:** Flags clients with excessive context switching (high session count but average duration < 15 minutes).
    - **Runaway Tasks:** Flags active tasks with > 10 hours tracked.
    - **Active Risks:** Displays active High/Medium risks from the client's projects.
    - **Stuck Tasks:** Displays tasks with > 5 hours tracked that have remained uncompleted for 14+ days.
- **Impact:** Provides the user with instant visibility into client-specific time-sinks, context-switching inefficiencies, and project risks right from their command center.

---

## 4. Reports View: Billing Summary
- **File:** [ReportGenerator.tsx](file:///f:/Application%20Projects/ChronoFlow/components/ReportGenerator.tsx)
- **Implementation:**
  - Added a toggle tab between **AI Report** (Gemini text generator) and a new **Billing Summary** interface.
  - Generates a breakdown table showing all tasks for the selected client, including:
    - **Raw Minutes:** Unrounded time logged.
    - **6-min Blocks:** Calculates the rounded blocks (rounded UP to the nearest 6 minutes, e.g., 7 mins -> 2 blocks / 12 mins).
    - **Billable Hours:** The resulting billable hours (where each block = 0.1 hours).
  - Summarizes unallocated/quick sessions.
  - Displays a highlighted **Total** row containing sum totals for raw minutes, billable blocks, and final billable hours.
- **Impact:** Dramatically simplifies the monthly or weekly billing process by automatically converting tracked time into standard MSP 6-minute billing units.

---

## 5. Global Search Upgrades (Highlighting & Multi-Entity)
- **File:** [SearchModal.tsx](file:///f:/Application%20Projects/ChronoFlow/components/SearchModal.tsx)
- **Implementation:**
  - Extended the search indexing to cover **Projects** and **Rocks** in addition to Tasks and Sessions.
  - Refined the matching algorithm to search stripped plain-text notes instead of raw HTML.
  - Added dynamic search matching **text highlighting** (yellow/indigo background) for search keywords in results.
  - Configured prioritized search scores (e.g. matching ticket numbers gets a higher score than matching description text).
- **Impact:** Makes finding past entries, tasks, rocks, and project details much faster and more visually apparent.

---

## 6. Time Rollup Data Integrity Fixes
- **File:** [contexts/TimerContext.tsx](file:///f:/Application%20Projects/ChronoFlow/contexts/TimerContext.tsx)
- **Implementation:**
  - **Reallocation Bug Fixed:** Rewrote the `updateSession` logic. If a session's task or subtask is changed, it now:
    - Correctly decrements the old allocation's time (checks if the old session had a subtask, and if so, decrements `oldSub.totalTime`; otherwise decrements `oldTask.totalTime`).
    - Correctly increments the new allocation's time (checks if a new subtask is selected, otherwise increments the new task).
  - **Session Reference Cleaning (Code Review Enhancement):** Fixed a subtle bug in the user's implementation of the reallocation logic. When changing tasks, if `updates.subtaskId` is not explicitly cleared by the modal, the session in state would have retained the old subtask ID. We added a cleanup step inside `updateSession` to delete the `subtaskId` key if the `taskId` changes without a new `subtaskId` being specified.
  - **Manual Entry Rollup:** Updated `addSession` to correctly increase subtask times for manual logs if a subtask is targeted.
- **Impact:** Guarantees absolute consistency between individual session times and the aggregated totals displayed on tasks/subtasks, eliminating data drift.

---

## 7. Additional Quality of Life Enhancements
- **Auto-backup Reminder (App.tsx):** Implemented a gentle, non-intrusive reminder that uses the in-app toast notification system to remind the user every 14 days to export a JSON backup of their time logs.
- **Plan Form Validation (PlanModal.tsx):** Added real-time warnings below the form fields to notify users of missing required inputs (like time, task, or title) and disabled submission until the inputs are valid.
- **Subtask Planning (types.ts & PlanModal.tsx):** Extended plans to support targeting specific `subtaskId` values, allowing for finer-grained planning.
- **Dependency Cleanups (package.json):** Cleaned up duplicate dependencies and standardized Vite and React 19 packages.