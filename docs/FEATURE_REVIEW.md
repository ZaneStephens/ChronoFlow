# Feature review — September 2026

ChronoFlow already covers capture, task/client organisation, projects, quarterly goals, planning, focus, reporting, and backups. The highest-value immediate improvements are in reviewing and correcting the working day: information should stay readable, actions should remain reachable, and gap filling should respect recorded work.

## Implemented

- **Readable entries:** recorded entries use a light surface with dark text and a client-colour border. The first line is `Client - notes`, falling back to subtask/task title or a quick-entry title. Rich notes are displayed as plain text without changing the saved HTML. Short blocks keep their title; full descriptions are available in the agenda and timeline tooltips. Planned blocks also lead with client and title.
- **Reliable gap actions:** the menu renders outside the scrolling timeline and entry stacking layers, clamps its position to the viewport, focuses its first action, and closes on Escape, outside interaction, scrolling, resize, or changing the day/view. Keyboard focus returns to its trigger.
- **Agenda review:** a chronological list includes entries starting anywhere on the selected day, including evenings. Search matches client, notes/title, task name, and ticket number. Each row opens the existing editor. The day summary shows recorded duration, entry count, and remaining plans.
- **Safer gap capture:** suggested manual ranges stop at occupied time. A backdated timer is offered only on today's last completed entry, with no later recorded interval. Enclosing sessions no longer create false gap controls.

## Compatibility

No schema, persistence, import/export service, timer context, or stored record migration changes. Agenda filtering never changes the day CSV contents. The existing six-column header, ordering, date/time formatting, and JSON merge/overwrite behaviour remain covered by regression tests. The day summary uses completed sessions starting on the selected date, consistent with the existing day export; it does not silently rewrite or deduplicate overlapping records.

## Next candidates

- Timeline lanes for overlapping work and a configurable displayed-hours range; agenda provides an immediate way to inspect all entries without altering their time geometry.
- A dedicated review queue for unallocated entries before reporting, building on the agenda's client search and existing editor.
- More consistent reporting date presets and project-to-task navigation, using existing data relationships.

## Validation

TypeScript check, production build, and 16 tests pass, including legacy backups/import, timer persistence, exact CSV structure, filtered full-day export, off-hours agenda visibility, portal placement, keyboard dismissal, and bounded gap logging. Browser visual verification was unavailable in this environment; the supplied screenshot and source inspection establish the contrast and stacking defects, with DOM interaction tests covering their fixes.
