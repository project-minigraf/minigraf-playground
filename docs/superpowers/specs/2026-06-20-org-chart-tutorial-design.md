# Org Chart Tutorial Design

**Issue:** #29  
**Date:** 2026-06-20  
**Status:** Approved

---

## Overview

Fills in `lib/lessons/tutorial-org-chart.ts` (stub added in the multi-tutorial UI commit) with 5 lessons covering the Datalog concepts unique to a company org chart scenario. The tutorial runs in its own isolated WASM/IDB instance. Each step is self-contained: its `starterCode` re-asserts all data it needs.

The storyline is a small company (TechCore Ltd) with employees, departments, reporting lines, and two temporal events: a reorg that moves Frank from Operations to Engineering (effective 2025-07-01), and a retroactive salary correction for Eve (raise effective 2025-04-01, recorded late). These two events are intentionally modelled on different time axes — valid time for the reorg (known effective date) and transaction time for the salary audit — to clearly contrast when to use each axis.

---

## Dataset

### `SETUP` (Lessons 1, 3, 4, 5)

Post-reorg state. Frank is already in Engineering. Alice has no department (she is the CEO above departments).

**Departments (4)**

| Entity | `:dept/name` |
|---|---|
| `:eng` | "Engineering" |
| `:mktg` | "Marketing" |
| `:ops` | "Operations" |
| `:legal` | "Legal" |

`:ops` and `:legal` have no employees in this state — they drive the negation lesson.

**Employees (6)**

| Entity | `:employee/name` | `:employee/title` | `:employee/department` | `:employee/manager` | `:employee/salary` | `:employee/hired-on` |
|---|---|---|---|---|---|---|
| `:alice` | "Alice" | "CEO" | *(none)* | *(none)* | 200000 | "2019-03-01" |
| `:bob` | "Bob" | "VP Engineering" | `:eng` | `:alice` | 150000 | "2020-06-15" |
| `:carol` | "Carol" | "VP Marketing" | `:mktg` | `:alice` | 130000 | "2020-09-01" |
| `:dave` | "Dave" | "Senior Engineer" | `:eng` | `:bob` | 110000 | "2022-01-15" |
| `:eve` | "Eve" | "Engineer" | `:eng` | `:bob` | 85000 | "2023-03-01" |
| `:frank` | "Frank" | "Operations Lead" | `:eng` | `:bob` | 100000 | "2021-11-01" |

**Project assignments**

| Entity | `:project/name` | Assigned via `:employee/project` |
|---|---|---|
| `:proj-alpha` | "Project Alpha" | Alice, Bob |
| `:proj-beta` | "Project Beta" | Carol, Dave |

Eve and Frank have no project assignments — drives Lesson 4 Step 2.

---

### `SETUP_L2` (Lesson 2 only)

Starts from the pre-reorg state. Frank's department and manager are modelled with **valid-time windows** (the reorg had a known effective date). Eve's salary correction is modelled as a **later transaction** (recorded after the fact), so `:as-of` queries can audit what the database believed before the correction.

Transaction sequence in `SETUP_L2`:

```
Tx 1 — all base facts:
  Frank dept/manager split into two valid-time windows:
    [:frank :employee/department :ops "2024-01-01" "2025-06-30"]
    [:frank :employee/manager :alice "2024-01-01" "2025-06-30"]
    [:frank :employee/department :eng "2025-07-01"]
    [:frank :employee/manager :bob "2025-07-01"]
  Eve salary: 85000 (permanent — no valid-time bounds)
  All other employees: same as SETUP

Tx 2 — retract Eve's permanent salary 85000

Tx 3 — assert Eve salary 85000, valid-to "2025-03-31"

Tx 4 — assert Eve salary 95000, valid-from "2025-04-01"
```

After these 4 transactions:
- `:valid-at "2025-01-01"` → Frank in `:ops`, reports to Alice
- `:valid-at "2025-10-01"` → Frank in `:eng`, reports to Bob
- `:as-of 1 :valid-at "2025-05-01"` → Eve salary 85000 (DB believed this before correction)
- `:valid-at "2025-05-01"` (current, as-of 4) → Eve salary 95000 (corrected reality)

---

## Lessons

### Lesson 1 — Employee facts and joins

**id:** `org-chart-1`  
**title:** Employee facts and joins  
**description:** Query employees by department and filter with expression clauses.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `o1-s1` | 3-hop join: employee → dept → dept name + employee title | 5 rows (Alice excluded — no dept): Bob/Engineering/VP Engineering, Carol/Marketing/VP Marketing, Dave/Engineering/Senior Engineer, Eve/Engineering/Engineer, Frank/Engineering/Operations Lead |
| 2 | `o1-s2` | Keyword literal filter: `[?emp :employee/department :eng]` before name joins | 4 rows: Bob, Dave, Eve, Frank |
| 3 | `o1-s3` | Expression clause `[(>= ?salary 100000)]` | Alice (200000), Bob (150000), Carol (130000), Dave (110000), Frank (100000) — Eve excluded |
| 4 | `o1-s4` | Open-ended: find employees hired after a given date | No expected result; tutor gives feedback |

---

### Lesson 2 — Bi-temporal history

**id:** `org-chart-2`  
**title:** Bi-temporal history  
**description:** Use valid-time snapshots to track the reorg and transaction-time queries to audit the retroactive salary correction. Clearly contrasts when to use each time axis.

All steps use `SETUP_L2`.

| Step | id | Focus | Key queries / Expected result |
|---|---|---|---|
| 1 | `o2-s1` | `:valid-at` for reorg snapshots | `:valid-at "2025-01-01"` → Frank dept `:ops`, manager Alice. `:valid-at "2025-10-01"` → Frank dept `:eng`, manager Bob. *Valid time answers: "what was true in the world on this date?"* |
| 2 | `o2-s2` | `:as-of` for salary audit | `:as-of 1 :valid-at "2025-05-01"` → Eve salary 85000. No `:as-of`, `:valid-at "2025-05-01"` → Eve salary 95000. *Transaction time answers: "what did the database believe at tx N?"* |
| 3 | `o2-s3` | Combine both axes | `:as-of 1 :valid-at "2025-10-01"` → Frank in `:ops` (reorg not yet recorded at tx 1). No `:as-of`, `:valid-at "2025-10-01"` → Frank in `:eng`. Demonstrates when you need both axes simultaneously for a full audit. |
| 4 | `o2-s4` | Open-ended: model a time-windowed fact and query at multiple dates | No expected result; tutor gives feedback |

---

### Lesson 3 — Recursive management chains

**id:** `org-chart-3`  
**title:** Recursive management chains  
**description:** Use recursive rules to traverse the full reporting hierarchy in both directions.

Uses `SETUP` (post-reorg state).

Rule pattern:
```datalog
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])
```

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `o3-s1` | Define base + recursive `reports-to` rule | Empty result (rule registration only) |
| 2 | `o3-s2` | Query everyone who directly or indirectly reports to Alice | Bob, Carol, Dave, Eve, Frank (all 5 non-CEO employees) |
| 3 | `o3-s3` | Query everyone in Bob's subtree (direct + indirect reports) | Dave, Eve, Frank |
| 4 | `o3-s4` | Open-ended: combine recursion with `:as-of` using `SETUP_L2` — who reported to Alice before the reorg? | No expected result; tutor gives feedback |

---

### Lesson 4 — Negation

**id:** `org-chart-4`  
**title:** Negation  
**description:** Use `not` and `not-join` to find employees and departments defined by the absence of a relationship.

Uses `SETUP` (post-reorg state).

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `o4-s1` | `not-join [?dept]`: departments with no employees | Operations, Legal |
| 2 | `o4-s2` | `not-join [?emp]`: employees not assigned to any project | Eve, Frank |
| 3 | `o4-s3` | `not`: employees who have no manager (top of hierarchy) | Alice |
| 4 | `o4-s4` | Open-ended: find Engineering employees not assigned to Project Alpha | No expected result; tutor gives feedback |

---

### Lesson 5 — Aggregates

**id:** `org-chart-5`  
**title:** Aggregates  
**description:** Use count, sum, and max to compute headcount and payroll figures grouped by department. Introduces parameterised query patterns.

Uses `SETUP` (post-reorg state). Alice is excluded from dept aggregates because she has no `:employee/department`.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `o5-s1` | `(count ?emp)` grouped by department name | Engineering 4, Marketing 1 |
| 2 | `o5-s2` | `(sum ?salary)` grouped by department | Engineering 445000 (150k+110k+85k+100k), Marketing 130000 |
| 3 | `o5-s3` | `(max ?salary)` grouped by department | Engineering 150000 (Bob), Marketing 130000 (Carol) |
| 4 | `o5-s4` | Open-ended: parameterise a query by department — swap the keyword literal to compare dept-by-dept without rewriting the query body | No expected result; tutor gives feedback |

---

## Implementation

**File to modify:** `lib/lessons/tutorial-org-chart.ts`

The stub currently has `lessons: []`. Replace with an array of 5 `Lesson` objects following the same structure as `lib/lessons/tutorial-marketplace.ts`:
- Two shared constants at the top of the file: `SETUP` and `SETUP_L2`
- Each lesson: `id`, `title`, `description`, `steps: LessonStep[]`
- Each step: `id`, `instruction` (markdown), `starterCode`, `expectedResult` (omit on open-ended steps), `hints` (2 entries), `successMessage`

No new files, types, or dependencies required.

**Structural tests:** Add to `__tests__/lib/lessons.test.ts` — verify that `tutorialOrgChart.lessons` has length 5, each lesson has the correct `id`, each non-open-ended step has a non-empty `expectedResult`, and step IDs are unique within the tutorial. Follow the marketplace test block as the pattern.

**E2E / step validation tests:** `__tests__/e2e/steps.test.ts` already covers all tutorials automatically. It loads the real WASM binary from `node_modules/@minigraf/browser/minigraf_bg.wasm`, runs each step's `starterCode` in a fresh in-memory `BrowserDb`, and asserts that the last query result's columns and rows (set-based, order-independent) match `expectedResult`. Open-ended steps (no `expectedResult`) and mutation-only steps (empty columns + rows) are skipped. No changes to this file are required — filling in the org chart lessons causes them to be picked up automatically.

> **Important — expected result row order:** `expectedResult.rows` must use the actual order returned by the WASM, since the E2E test uses set-based comparison and is order-independent. Numeric values (salaries, counts) appear as strings in `rows` since `QueryResult.rows` is `string[][]`. If a step fails the E2E test, adjust `expectedResult` to match the WASM output rather than the other way round.
