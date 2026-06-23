# QA Plan — Triade Saúde Tasks Workspace

**Owner (QA):** Quinn (Guardian)
**Status:** PLANNED — execution blocked on aios-dev delivery
**Scope:** Tasks feature (storage, NewTaskDialog, CalendarView, KanbanView, FilterPanel)
**Last updated:** 2026-06-23

---

## 0. Pre-Flight Notes (read first)

Findings from inspecting current code before writing this plan:

1. **Current state of `src/components/tasks-workspace.tsx`:** 69 lines, in-memory `useState(initialTasks)`, two views (`list` | `kanban`), no localStorage, no dialog, no calendar, no filter panel, no drag-drop. The features in this plan are therefore **prospective** — they describe the surface aios-dev is expected to ship.
2. **Test tooling already in repo:** `package.json` uses `tsx --test` (Node native test runner) via `npm run test:unit`. Jest + React Testing Library is **not installed**. Recommendation in section 6 reflects this — adding Jest/RTL is a setup task in itself, not a freebie.
3. **No prior `docs/` directory** — this file establishes it.
4. **No `.aios-core/` or `.aios/`** in this repo, so standard AIOS gate templates are not used; gate decision at end of doc follows the same APPROVED / NEEDS_WORK / FAIL contract.

If aios-dev's delivery diverges from the assumed component names or APIs below, update the matrix in §1 and the test IDs in §2 before executing.

---

## 1. Test Matrix (component × functionality)

Legend: **U** = unit, **I** = integration, **E** = E2E, **M** = manual, **—** = N/A

| Component / Module          | Create | Read | Update | Delete | Filter | Persist | Drag-Drop | A11y | Perf |
|-----------------------------|:------:|:----:|:------:|:------:|:------:|:-------:|:---------:|:----:|:----:|
| `lib/storage` (localStorage)| U      | U    | U      | U      | U      | U / E   | —         | —    | U    |
| `NewTaskDialog`             | I      | —    | I      | —      | —      | —       | —         | M    | —    |
| `TaskList` / list view      | —      | I    | I      | I      | I      | E       | —         | M    | M    |
| `KanbanView`                | —      | I    | I      | —      | I      | E       | I + E     | M    | M    |
| `CalendarView`              | —      | I    | I      | —      | I      | E       | I + E     | M    | M    |
| `FilterPanel`               | —      | —    | —      | —      | I      | —       | —         | M    | —    |
| Full app (router level)     | E      | E    | E      | E      | E      | E       | E         | M    | M    |

---

## 2. Detailed Test Cases (arrange / act / assert)

### 2.1 Unit — Storage Layer (`src/lib/storage.ts`, expected)

**TC-U-01 — `getTasks()` returns `[]` when localStorage is empty**
- Arrange: `localStorage.clear()`.
- Act: `const tasks = getTasks();`
- Assert: `tasks` is `[]`, no throw.

**TC-U-02 — `addTask(input)` assigns unique id and persists**
- Arrange: empty store; spy on `crypto.randomUUID` if used.
- Act: `const t = addTask({ title: "Audit RLS", status: "todo" });`
- Assert: `t.id` is non-empty string; `getTasks()` contains a task with that id; calling `addTask` twice yields two distinct ids.

**TC-U-03 — `updateTask(id, patch)` mutates only the targeted record**
- Arrange: seed two tasks A and B.
- Act: `updateTask(A.id, { status: "done" });`
- Assert: A.status === "done"; B is untouched (deep-equal pre-state); persisted to localStorage.

**TC-U-04 — `updateTask` on unknown id is a no-op (does not create)**
- Arrange: seed one task.
- Act: `updateTask("does-not-exist", { title: "x" });`
- Assert: store length unchanged; no task with title "x".

**TC-U-05 — `deleteTask(id)` removes the record**
- Arrange: seed three tasks.
- Act: `deleteTask(tasks[1].id);`
- Assert: `getTasks().length === 2`; the removed id is absent.

**TC-U-06 — `deleteTask` on unknown id is a no-op (no throw)**
- Arrange: seed two tasks.
- Act: `deleteTask("ghost");`
- Assert: store length === 2; no exception.

**TC-U-07 — `filteredTasks({ status })` filters correctly**
- Arrange: seed `[{status:'todo'}, {status:'doing'}, {status:'done'}, {status:'todo'}]`.
- Act: `filteredTasks({ status: 'todo' });`
- Assert: length === 2 and every result has `status === 'todo'`.

**TC-U-08 — `filteredTasks` combines predicates (AND semantics)**
- Arrange: seed tasks varying by `status` and `assignee`.
- Act: `filteredTasks({ status: 'todo', assignee: 'nilton' });`
- Assert: only tasks matching BOTH are returned.

**TC-U-09 — `filteredTasks` with no predicates returns all**
- Arrange: seed 5 tasks.
- Act: `filteredTasks({});`
- Assert: length === 5.

**TC-U-10 — Corrupted localStorage payload returns `[]` (does not throw)**
- Arrange: `localStorage.setItem('tasks', '{not-json');`
- Act: `getTasks();`
- Assert: returns `[]`; emits a single console.warn (or sentinel of choice); subsequent `addTask` works.

**TC-U-11 — `QuotaExceededError` surfaces as a typed result**
- Arrange: mock `localStorage.setItem` to throw `QuotaExceededError`.
- Act: `addTask({ title: "x" });`
- Assert: function either returns `{ ok: false, reason: 'quota' }` or throws a known `StorageQuotaError`. **Decision needed from dev** — document whichever contract ships.

### 2.2 Integration — Components

**TC-I-01 — NewTaskDialog: happy path creates and surfaces task**
- Arrange: render `<TasksWorkspace />` with empty store; open dialog.
- Act: type "Revisar RLS" in title field; submit.
- Assert: dialog closes; new row visible in list view with title "Revisar RLS"; `getTasks()` length increased by 1.

**TC-I-02 — NewTaskDialog: empty title shows validation error and blocks submit**
- Arrange: open dialog.
- Act: leave title empty; click submit.
- Assert: validation message visible (text or `aria-invalid="true"`); dialog stays open; store unchanged.

**TC-I-03 — NewTaskDialog: escape key closes without saving**
- Arrange: open dialog; type partial title.
- Act: press `Escape`.
- Assert: dialog closes; store unchanged.

**TC-I-04 — CalendarView: task with `dueDate=2026-07-15` renders on that day cell**
- Arrange: seed one task with that dueDate; render calendar at month=July 2026.
- Assert: task chip is the descendant of the day-15 cell, not any other.

**TC-I-05 — CalendarView: drag a task from day 15 to day 20 updates dueDate**
- Arrange: seed task on 2026-07-15.
- Act: simulate dragstart on the chip, dragover/drop on day 20.
- Assert: task's `dueDate === '2026-07-20'`; persisted to localStorage; chip now under day-20 cell.

**TC-I-06 — FilterPanel: enabling `status=todo` hides non-matching tasks**
- Arrange: seed mixed-status tasks.
- Act: toggle the `todo` filter on.
- Assert: only `todo` tasks visible; counter (if present) reflects filtered count.

**TC-I-07 — FilterPanel: clearing filter restores full list**
- Arrange: state from TC-I-06.
- Act: clear filter.
- Assert: all originally-seeded tasks visible again, in their original order.

**TC-I-08 — KanbanView: drag from `todo` column to `doing` column changes status**
- Arrange: seed task with `status: 'todo'`.
- Act: drag chip to `doing` column.
- Assert: task `status === 'doing'`; persisted; chip now rendered under `doing` column.

**TC-I-09 — KanbanView: dropping outside a valid column is a no-op**
- Arrange: seed `todo` task.
- Act: drag and drop on the page background.
- Assert: status unchanged.

### 2.3 E2E — User Journeys

**TC-E-01 — Golden path**
1. Open app fresh (empty localStorage).
2. Click "Nova tarefa" → fill title, status=todo, dueDate=2026-07-10 → submit.
3. Apply `status=todo` filter → task visible.
4. Switch to Kanban → drag task to `doing`.
5. Switch to Calendar → task appears on 2026-07-10.
- Assert each step succeeds; final localStorage contains exactly one task with `status='doing'` and the chosen dueDate.

**TC-E-02 — Refresh persists state**
- Arrange: complete TC-E-01.
- Act: full page reload.
- Assert: task is still present, still status `doing`, still on 2026-07-10.

**TC-E-03 — Multiple sequential operations**
- Create 5 tasks; edit 2; delete 1; move 2 through statuses; reload.
- Assert: final state is exactly 4 tasks, with the expected statuses.

**TC-E-04 — Quota exceeded (edge case)**
- Arrange: fill localStorage with bulk data near the quota; attempt to add another task.
- Assert: user-facing error toast or banner; no silent data loss; existing tasks remain readable.

### 2.4 Edge Cases

| ID        | Scenario                                      | Expected                                                       |
|-----------|-----------------------------------------------|----------------------------------------------------------------|
| TC-EC-01  | Submit task with whitespace-only title        | Treated as empty; same validation as TC-I-02                   |
| TC-EC-02  | dueDate set to invalid string (`"abc"`)       | Either rejected at form-level OR stored as null with fallback  |
| TC-EC-03  | dueDate in distant past (1999-01-01)          | Allowed; CalendarView navigates correctly                      |
| TC-EC-04  | Task title with 500+ chars                    | Either truncated visually with tooltip OR enforced max length  |
| TC-EC-05  | Two browser tabs editing the same task        | Last-write-wins is acceptable; document the behavior           |
| TC-EC-06  | localStorage unavailable (private mode block) | App still renders; show in-session-only banner; no crash       |
| TC-EC-07  | Manually corrupted JSON in localStorage       | App resets to empty + warns; does not white-screen             |

---

## 3. Manual Verification Checklist

### 3.1 Keyboard navigation
- [ ] `Tab` order through tasks-workspace is logical (top-left → bottom-right reading order).
- [ ] `Enter` on the "Nova tarefa" button opens the dialog.
- [ ] `Enter` inside the title field submits the form (or moves to next field — document either, just be consistent).
- [ ] `Escape` closes the dialog and any open menus.
- [ ] Focus returns to the trigger button after dialog close.
- [ ] No focus traps outside of intentional modal traps.

### 3.2 Responsive
- [ ] 320px width: list view usable, no horizontal scroll on body.
- [ ] 768px width: kanban columns either stack or scroll horizontally without clipping.
- [ ] 1280px+: calendar shows full month grid without truncation.

### 3.3 Accessibility
- [ ] All interactive elements have an accessible name (visible label OR `aria-label`).
- [ ] Dialog has `role="dialog"` and `aria-modal="true"`.
- [ ] Drag-and-drop has a keyboard alternative (e.g. move-to-status menu) — **non-negotiable**, otherwise the feature is inaccessible.
- [ ] Color is not the sole carrier of status info (text or icon backs every color cue).
- [ ] Contrast ratio for text ≥ 4.5:1 (verify on each theme via DevTools).

### 3.4 Performance smoke
- [ ] With 100 seeded tasks, initial render < 200ms on a mid-tier laptop.
- [ ] Drag a task in Kanban: no visible jank (60fps target).
- [ ] Filter toggle on 100 tasks completes within one frame.

---

## 4. Bug Report Template

When a defect is found, log it in `docs/QA-FINDINGS.md` using:

```
### BUG-NNN — <one-line title>
- Severity: BLOCKER | HIGH | MEDIUM | LOW
- Component: <file or feature>
- Test case: <TC-X-NN that surfaced it>
- Repro:
  1. ...
  2. ...
- Expected: ...
- Actual: ...
- Evidence: <screenshot / console excerpt / failing test name>
```

Severity rubric:
- **BLOCKER**: data loss, app crash, security exposure, or AC not implemented.
- **HIGH**: feature works but violates accessibility or persistence guarantees.
- **MEDIUM**: edge case mishandled; UX awkward but no data risk.
- **LOW**: cosmetic, copy, minor inconsistency.

---

## 5. Findings (to be populated after execution)

_None yet — aios-dev delivery pending._

---

## 6. Tooling Recommendation

### Pragmatic path (lowest setup cost)
- **Unit (storage layer):** keep using the existing `tsx --test` runner. The storage module should be a pure TS file with no React imports — testable today without adding deps.
- **Integration (components):** add `@testing-library/react` + `@testing-library/dom` + `jsdom`, wired into either `tsx --test` (via a small jsdom bootstrap) or Vitest. **Vitest is the better fit** for this Next.js 16 / React 19 stack — Jest's React 19 support has historically lagged.
- **E2E:** Playwright. It handles drag-and-drop natively, has first-class TS support, and a single `npx playwright install` gets you the browsers.

### If the team insists on Jest
Pin `jest@^29` and `jest-environment-jsdom@^29`, add `@testing-library/jest-dom`, and use SWC for transforms (`@swc/jest`). Expect to spend ~1 hour on config before the first green test.

---

## 7. Execution Plan (post-dev)

1. **Smoke**: open the app, do TC-E-01 by hand. If it fails, halt and file a BLOCKER — automated runs after that are wasted time until the golden path passes.
2. **Unit suite**: run `npm run test:unit`. All §2.1 cases must be green.
3. **Integration suite**: run the new RTL/Vitest suite. All §2.2 cases must be green.
4. **E2E**: run Playwright. §2.3 cases must be green; §2.4 edge cases are advisory unless dev has explicitly claimed coverage.
5. **Manual**: complete §3 checklists. Each unchecked item that can't be excused = a logged finding.
6. **Gate**: write the decision in §8 of this file.

---

## 8. Gate Decision

**Status:** NEEDS_WORK (pre-execution — dev not yet delivered)

**Blocking items before APPROVED is possible:**
- aios-dev must implement the `lib/storage` module, `NewTaskDialog`, `CalendarView`, `FilterPanel`, and drag-drop in both Kanban and Calendar views.
- Test tooling (RTL + Playwright, or the team's chosen equivalent) must be added to `package.json`.
- Every test case in §2.1 through §2.3 must execute and pass.
- The keyboard alternative for drag-drop (see §3.3) is a hard requirement, not a nice-to-have.

Re-run this gate after dev completion. Update §5 with findings, then revise §8 to APPROVED, NEEDS_WORK (with specifics), or FAIL.
