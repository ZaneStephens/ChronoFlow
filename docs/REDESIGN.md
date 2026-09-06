# ChronoFlow workspace redesign

This branch reworks ChronoFlow around a calmer daily workflow: understand today's work, choose a next action, capture time and review the result. It replaces the dark dashboard and oversized timer UI with warm neutral surfaces, a forest-green navigation rail, editorial headings and a consistent set of controls.

## Review findings and response

These findings come from reviewing the original source. Browser-based visual auditing was unavailable in the implementation environment.

| Original friction                                                                             | Redesigned behaviour                                                                                                                                                      |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The sidebar disappears below the desktop breakpoint without a replacement navigation control. | A mobile menu exposes every workspace and backup action.                                                                                                                  |
| The overview mixes lifetime totals with daily indicators and offers few direct next actions.  | The daily overview groups logged time, client work, next tasks, recent sessions and a quick timer. Daily metrics clip sessions at local midnight and exclude future days. |
| First-run onboarding can stand between returning users and their work.                        | Existing tasks, sessions or projects open the workspace directly. New users can start immediately or take the tour.                                                       |
| Task controls are crowded and there is no text search.                                        | Search, client filters, board/list layouts, explicit status selection, expandable steps and a focused creation dialog.                                                    |
| Search results are informational rather than actionable.                                      | Task and time-entry results open their corresponding detail/edit experience. Other results navigate to their workspace.                                                   |
| Focus mode cannot start a timer itself.                                                       | Choose an open task or start an unallocated session directly from Focus space.                                                                                            |
| Project and goal lists obscure the next action.                                               | Project cards expose next milestones; goal rows show key-result completion, quarter filters and progress. Goals also support manual creation without AI.                  |
| Time logging and planning rely heavily on interacting with the timeline grid.                 | Explicit Log time and Plan time actions, a date picker and an always-visible CSV export action.                                                                           |
| Styling depends on a runtime CDN.                                                             | Tailwind is compiled into the production CSS; the HTML shell no longer fetches styling or dependency import maps.                                                         |

Detailed project planning, risk/milestone editing, recurrence, reporting and rich session notes retain their underlying workflows with the new surface, typography and control treatment.

## Compatibility contract

- `services/storageService.ts`, `contexts/DataContext.tsx`, `contexts/TimerContext.tsx` and `types.ts` are unchanged.
- IndexedDB remains `chronoflow`, version `1`, with the same object stores and `data` keys. The existing localStorage migration remains intact.
- JSON exports retain `version: 1`, `timestamp` and the nine existing collections. Merge continues to replace matching IDs while retaining other records. Overwrite replaces collections supplied in the backup and clears the active timer, as before.
- Existing active timers survive hydration and refresh.
- Timed sessions still round upward to a minimum six-minute billing block.
- The app remains local-first. There is no new account, storage service, sync or analytics.

### Day CSV

The filename remains `timesheet_YYYY-MM-DD.csv`. The exact header is:

```csv
Ticket #,Client,Date,Start,End,Description
```

The export retains the local date format, `H:mm` time format, quoted data fields, LF line endings, client sorting, no BOM, and no additional columns. It excludes unfinished sessions. Description precedence remains subtask title, stripped notes, custom title, task title, then `No Desc`. Task-linked clients retain priority over directly linked clients, with the existing fallback.

Embedded double quotes now use standard CSV escaping. Client names containing commas are sorted using their actual names instead of splitting an already-quoted CSV row. These correct malformed-field edge cases without altering the six-column structure.

## Verification

Run:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

The tests cover:

- Legacy localStorage migration and all persisted collections.
- JSON backup export, merge, overwrite, refresh and active-timer restoration.
- Client/task creation, task filters and layouts, status changes, and timer finalisation.
- Project navigation and manual quarterly goal creation.
- Day selection and downloaded CSV filename/content.
- CSV quoting, field precedence, empty days, orphaned links and Unicode.
- Daily metrics at midnight and the Australian daylight-saving boundary.
- First-run entry, unallocated focus sessions and actionable search.

The interaction tests use React Testing Library, jsdom and fake IndexedDB. They verify component behaviour and persistence, not browser layout or actual browser download behaviour.

## Remaining visual review

The environment's cloud browser rejected the local preview connection. Responsive CSS has been implemented for desktop, tablet and mobile, but screenshots and browser layout verification could not be completed. AI calls also require the existing configured Netlify function and were not exercised against the live provider.

Before merging, inspect the branch in a browser at desktop and narrow widths, including the mobile menu, populated task cards, long project titles, recurring plans, rich-text editing and report output. Confirm the day CSV in the downstream system that consumes it.

No production deployment or merge is included in this branch.
