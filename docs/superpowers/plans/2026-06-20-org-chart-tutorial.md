# Org Chart Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill in `lib/lessons/tutorial-org-chart.ts` with 5 lessons teaching employee joins, bi-temporal history (valid-time vs transaction-time), recursive management chains, negation, and aggregates using the TechCore org chart dataset.

**Architecture:** Each lesson is a `Lesson` object added to the `tutorialOrgChart.lessons` array. Each step is self-contained — its `starterCode` re-asserts the full dataset via a shared `SETUP` constant (Lessons 1, 3, 4, 5) or `SETUP_L2` (Lesson 2 only). `SETUP_L2` models Frank's reorg with valid-time windows and Eve's salary correction as later transactions so `:as-of` queries can audit what the database believed before the correction was recorded. The E2E test at `__tests__/e2e/steps.test.ts` picks up the new lessons automatically — no changes to that file required. Structural tests in `__tests__/lib/lessons.test.ts` are added one lesson at a time, written before the implementation (TDD).

**Tech Stack:** TypeScript, Minigraf Datalog (EDN syntax), Jest

> **Important — expected result row order:** The exact row order returned by the WASM for multi-row results is not guaranteed. After implementing each lesson, run the E2E test suite (`npm test -- --testPathPattern=e2e`) and check whether any step fails. If a step fails due to row-order mismatch, reorder the `rows` array in `expectedResult` to match actual WASM output. Numeric values (salaries, counts) appear as strings in `rows` since `QueryResult.rows` is `string[][]`.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `lib/lessons/tutorial-org-chart.ts` | Modify | Replace `lessons: []` with 5 `Lesson` objects + `SETUP` + `SETUP_L2` constants |
| `__tests__/lib/lessons.test.ts` | Modify | Add org-chart-specific structural tests (one `describe` block per lesson) |

No new files, types, hooks, or dependencies needed.

---

## Shared datasets

### `SETUP` (Lessons 1, 3, 4, 5)

Post-reorg state. Frank is in Engineering. No valid-time bounds on any facts — this dataset is used for non-temporal lessons.

```
; Departments — :ops and :legal have no employees (drives negation lesson)
(transact [[:eng :dept/name "Engineering"]
           [:mktg :dept/name "Marketing"]
           [:ops :dept/name "Operations"]
           [:legal :dept/name "Legal"]])

; Employees (post-reorg: Frank in Engineering, reporting to Bob)
; Alice has no :employee/department — she is CEO above departments
(transact [[:alice :employee/name "Alice"]
           [:alice :employee/title "CEO"]
           [:alice :employee/salary 200000]
           [:alice :employee/hired-on "2019-03-01"]
           [:bob :employee/name "Bob"]
           [:bob :employee/title "VP Engineering"]
           [:bob :employee/department :eng]
           [:bob :employee/manager :alice]
           [:bob :employee/salary 150000]
           [:bob :employee/hired-on "2020-06-15"]
           [:carol :employee/name "Carol"]
           [:carol :employee/title "VP Marketing"]
           [:carol :employee/department :mktg]
           [:carol :employee/manager :alice]
           [:carol :employee/salary 130000]
           [:carol :employee/hired-on "2020-09-01"]
           [:dave :employee/name "Dave"]
           [:dave :employee/title "Senior Engineer"]
           [:dave :employee/department :eng]
           [:dave :employee/manager :bob]
           [:dave :employee/salary 110000]
           [:dave :employee/hired-on "2022-01-15"]
           [:eve :employee/name "Eve"]
           [:eve :employee/title "Engineer"]
           [:eve :employee/department :eng]
           [:eve :employee/manager :bob]
           [:eve :employee/salary 85000]
           [:eve :employee/hired-on "2023-03-01"]
           [:frank :employee/name "Frank"]
           [:frank :employee/title "Operations Lead"]
           [:frank :employee/department :eng]
           [:frank :employee/manager :bob]
           [:frank :employee/salary 100000]
           [:frank :employee/hired-on "2021-11-01"]])

; Projects — Eve and Frank have no assignments (drives negation lesson)
(transact [[:proj-alpha :project/name "Project Alpha"]
           [:proj-beta :project/name "Project Beta"]
           [:alice :employee/project :proj-alpha]
           [:bob :employee/project :proj-alpha]
           [:carol :employee/project :proj-beta]
           [:dave :employee/project :proj-beta]])
```

### `SETUP_L2` (Lesson 2 only)

Transaction sequence (each `(transact ...)` / `(retract ...)` call is one tx):

| Tx | Content |
|---|---|
| 1 | Departments |
| 2 | All employees. Frank's `:employee/department` and `:employee/manager` are in the **pre-reorg** state using the 5-element per-fact valid-time form: `[:frank :employee/department :ops "2024-01-01" "2025-06-30"]`. Eve salary: 85000 (permanent, no valid-time bounds). |
| 3 | Frank post-reorg: `(transact {:valid-from "2025-07-01"} [[:frank :employee/department :eng] [:frank :employee/manager :bob]])` |
| 4 | `(retract [[:eve :employee/salary 85000]])` |
| 5 | `(transact {:valid-to "2025-03-31"} [[:eve :employee/salary 85000]])` |
| 6 | `(transact {:valid-from "2025-04-01"} [[:eve :employee/salary 95000]])` |

Key query reference:
- `:valid-at "2025-01-01"` → Frank dept `:ops` (pre-reorg window covers this date)
- `:valid-at "2025-10-01"` → Frank dept `:eng` (post-reorg window covers this date)
- `:as-of 2 :valid-at "2025-05-01"` → Eve salary `85000` (correction not recorded at tx 2)
- `:valid-at "2025-05-01"` (current) → Eve salary `95000` (correction applied at tx 4–6)
- `:as-of 2 :valid-at "2025-10-01"` → Frank not in any dept (post-reorg fact at tx 3 not visible)
- `:valid-at "2025-10-01"` (current) → Frank dept `:eng`

```
; Departments
(transact [[:eng :dept/name "Engineering"]
           [:mktg :dept/name "Marketing"]
           [:ops :dept/name "Operations"]
           [:legal :dept/name "Legal"]])

; Employees — Frank's dept/manager use 5-element per-fact valid-time for the reorg
(transact [[:alice :employee/name "Alice"]
           [:alice :employee/title "CEO"]
           [:alice :employee/salary 200000]
           [:alice :employee/hired-on "2019-03-01"]
           [:bob :employee/name "Bob"]
           [:bob :employee/title "VP Engineering"]
           [:bob :employee/department :eng]
           [:bob :employee/manager :alice]
           [:bob :employee/salary 150000]
           [:bob :employee/hired-on "2020-06-15"]
           [:carol :employee/name "Carol"]
           [:carol :employee/title "VP Marketing"]
           [:carol :employee/department :mktg]
           [:carol :employee/manager :alice]
           [:carol :employee/salary 130000]
           [:carol :employee/hired-on "2020-09-01"]
           [:dave :employee/name "Dave"]
           [:dave :employee/title "Senior Engineer"]
           [:dave :employee/department :eng]
           [:dave :employee/manager :bob]
           [:dave :employee/salary 110000]
           [:dave :employee/hired-on "2022-01-15"]
           [:eve :employee/name "Eve"]
           [:eve :employee/title "Engineer"]
           [:eve :employee/department :eng]
           [:eve :employee/manager :bob]
           [:eve :employee/salary 85000]
           [:eve :employee/hired-on "2023-03-01"]
           [:frank :employee/name "Frank"]
           [:frank :employee/title "Operations Lead"]
           [:frank :employee/salary 100000]
           [:frank :employee/hired-on "2021-11-01"]
           ; Frank pre-reorg: in Operations, reporting to Alice (valid until end of June 2025)
           [:frank :employee/department :ops "2024-01-01" "2025-06-30"]
           [:frank :employee/manager :alice "2024-01-01" "2025-06-30"]])

; Frank post-reorg: moves to Engineering under Bob (valid from 2025-07-01) — tx 3
(transact {:valid-from "2025-07-01"}
  [[:frank :employee/department :eng]
   [:frank :employee/manager :bob]])

; Eve salary correction: recorded as later transactions — tx 4, 5, 6
(retract [[:eve :employee/salary 85000]])

(transact {:valid-to "2025-03-31"}
  [[:eve :employee/salary 85000]])

(transact {:valid-from "2025-04-01"}
  [[:eve :employee/salary 95000]])
```

---

## Task 1 — Lesson 1: Employee facts and joins

**Files:**
- Modify: `lib/lessons/tutorial-org-chart.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `__tests__/lib/lessons.test.ts` after the existing `describe('marketplace tutorial', ...)` block:

```typescript
describe('org chart tutorial', () => {
  const orgChart = TUTORIALS.find((t) => t.id === 'org-chart')!

  describe('lesson 1 — employee facts and joins', () => {
    it('exists with correct id', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-1')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-1')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      orgChart.lessons.find((l) => l.id === 'org-chart-1')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-1')!.steps[3].expectedResult).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — `orgChart.lessons.find(...)` returns `undefined` because `lessons: []`.

- [ ] **Step 3: Implement `SETUP`, `SETUP_L2`, and `lesson1` in `tutorial-org-chart.ts`**

Replace the file entirely with:

```typescript
import type { Lesson, Tutorial } from '@/lib/types'

const SETUP = `; Departments — :ops and :legal have no employees (drives negation lesson)
(transact [[:eng :dept/name "Engineering"]
           [:mktg :dept/name "Marketing"]
           [:ops :dept/name "Operations"]
           [:legal :dept/name "Legal"]])

; Employees (post-reorg: Frank in Engineering, reporting to Bob)
; Alice has no :employee/department — she is CEO above departments
(transact [[:alice :employee/name "Alice"]
           [:alice :employee/title "CEO"]
           [:alice :employee/salary 200000]
           [:alice :employee/hired-on "2019-03-01"]
           [:bob :employee/name "Bob"]
           [:bob :employee/title "VP Engineering"]
           [:bob :employee/department :eng]
           [:bob :employee/manager :alice]
           [:bob :employee/salary 150000]
           [:bob :employee/hired-on "2020-06-15"]
           [:carol :employee/name "Carol"]
           [:carol :employee/title "VP Marketing"]
           [:carol :employee/department :mktg]
           [:carol :employee/manager :alice]
           [:carol :employee/salary 130000]
           [:carol :employee/hired-on "2020-09-01"]
           [:dave :employee/name "Dave"]
           [:dave :employee/title "Senior Engineer"]
           [:dave :employee/department :eng]
           [:dave :employee/manager :bob]
           [:dave :employee/salary 110000]
           [:dave :employee/hired-on "2022-01-15"]
           [:eve :employee/name "Eve"]
           [:eve :employee/title "Engineer"]
           [:eve :employee/department :eng]
           [:eve :employee/manager :bob]
           [:eve :employee/salary 85000]
           [:eve :employee/hired-on "2023-03-01"]
           [:frank :employee/name "Frank"]
           [:frank :employee/title "Operations Lead"]
           [:frank :employee/department :eng]
           [:frank :employee/manager :bob]
           [:frank :employee/salary 100000]
           [:frank :employee/hired-on "2021-11-01"]])

; Projects — Eve and Frank have no assignments (drives negation lesson)
(transact [[:proj-alpha :project/name "Project Alpha"]
           [:proj-beta :project/name "Project Beta"]
           [:alice :employee/project :proj-alpha]
           [:bob :employee/project :proj-alpha]
           [:carol :employee/project :proj-beta]
           [:dave :employee/project :proj-beta]])`

// Lesson 2 variant: Frank's dept/manager use per-fact valid-time for the reorg.
// Eve salary starts permanent (tx 2) then is corrected retroactively (tx 4-6)
// so :as-of queries can show what the DB believed before the correction.
const SETUP_L2 = `; Departments
(transact [[:eng :dept/name "Engineering"]
           [:mktg :dept/name "Marketing"]
           [:ops :dept/name "Operations"]
           [:legal :dept/name "Legal"]])

; Employees — Frank's dept/manager use 5-element per-fact valid-time for the reorg
(transact [[:alice :employee/name "Alice"]
           [:alice :employee/title "CEO"]
           [:alice :employee/salary 200000]
           [:alice :employee/hired-on "2019-03-01"]
           [:bob :employee/name "Bob"]
           [:bob :employee/title "VP Engineering"]
           [:bob :employee/department :eng]
           [:bob :employee/manager :alice]
           [:bob :employee/salary 150000]
           [:bob :employee/hired-on "2020-06-15"]
           [:carol :employee/name "Carol"]
           [:carol :employee/title "VP Marketing"]
           [:carol :employee/department :mktg]
           [:carol :employee/manager :alice]
           [:carol :employee/salary 130000]
           [:carol :employee/hired-on "2020-09-01"]
           [:dave :employee/name "Dave"]
           [:dave :employee/title "Senior Engineer"]
           [:dave :employee/department :eng]
           [:dave :employee/manager :bob]
           [:dave :employee/salary 110000]
           [:dave :employee/hired-on "2022-01-15"]
           [:eve :employee/name "Eve"]
           [:eve :employee/title "Engineer"]
           [:eve :employee/department :eng]
           [:eve :employee/manager :bob]
           [:eve :employee/salary 85000]
           [:eve :employee/hired-on "2023-03-01"]
           [:frank :employee/name "Frank"]
           [:frank :employee/title "Operations Lead"]
           [:frank :employee/salary 100000]
           [:frank :employee/hired-on "2021-11-01"]
           ; Frank pre-reorg: in Operations, reporting to Alice (valid until end of June 2025)
           [:frank :employee/department :ops "2024-01-01" "2025-06-30"]
           [:frank :employee/manager :alice "2024-01-01" "2025-06-30"]])

; Frank post-reorg: moves to Engineering under Bob (valid from 2025-07-01) — tx 3
(transact {:valid-from "2025-07-01"}
  [[:frank :employee/department :eng]
   [:frank :employee/manager :bob]])

; Eve salary correction: raise should have applied from 2025-04-01
; but was only recorded in a later transaction — tx 4, 5, 6
(retract [[:eve :employee/salary 85000]])

(transact {:valid-to "2025-03-31"}
  [[:eve :employee/salary 85000]])

(transact {:valid-from "2025-04-01"}
  [[:eve :employee/salary 95000]])`

const lesson1: Lesson = {
  id: 'org-chart-1',
  title: 'Employee facts and joins',
  description: 'Query employees by department and title, and filter with expression clauses.',
  steps: [
    {
      id: 'o1-s1',
      instruction: `## Step 1: List all employees with their department and title

The dataset has departments, employees with titles and salaries, projects, and reporting lines. Run the setup and query to see every employee alongside their department name and job title.

The query joins \`employee → :employee/department → :dept/name\`. Alice (CEO) has no department and is excluded.`,
      starterCode: `${SETUP}

(query [:find ?name ?dept-name ?title
        :where [?emp :employee/name ?name]
               [?emp :employee/title ?title]
               [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]])`,
      expectedResult: {
        columns: ['?name', '?dept-name', '?title'],
        rows: [
          ['Bob', 'Engineering', 'VP Engineering'],
          ['Carol', 'Marketing', 'VP Marketing'],
          ['Dave', 'Engineering', 'Senior Engineer'],
          ['Eve', 'Engineering', 'Engineer'],
          ['Frank', 'Engineering', 'Operations Lead'],
        ],
      },
      hints: [
        'Alice has no `:employee/department` fact, so the join `[?emp :employee/department ?dept]` finds no match for her — she is naturally excluded.',
        'Chain clauses to walk the entity relationship: `?dept` binds to the department entity, then `[?dept :dept/name ?dept-name]` resolves the name.',
      ],
      successMessage: 'Five employees retrieved with their departments and titles.',
    },
    {
      id: 'o1-s2',
      instruction: `## Step 2: Filter to a single department

Replace the variable \`?dept\` with the keyword literal \`:eng\` to restrict the query to Engineering employees only.`,
      starterCode: `${SETUP}

(query [:find ?name ?title
        :where [?emp :employee/department :eng]
               [?emp :employee/name ?name]
               [?emp :employee/title ?title]])`,
      expectedResult: {
        columns: ['?name', '?title'],
        rows: [
          ['Bob', 'VP Engineering'],
          ['Dave', 'Senior Engineer'],
          ['Eve', 'Engineer'],
          ['Frank', 'Operations Lead'],
        ],
      },
      hints: [
        'Using `:eng` as a literal in the pattern position binds that clause to the exact entity — no variable needed for the department.',
        'Carol (Marketing) and Alice (no dept) do not appear because neither has `:employee/department :eng`.',
      ],
      successMessage: 'Four Engineering employees retrieved.',
    },
    {
      id: 'o1-s3',
      instruction: `## Step 3: Filter by salary threshold

Add an expression clause \`[(>= ?salary 100000)]\` after binding \`?salary\` to keep only employees earning at least 100,000.`,
      starterCode: `${SETUP}

(query [:find ?name ?salary
        :where [?emp :employee/name ?name]
               [?emp :employee/salary ?salary]
               [(>= ?salary 100000)]])`,
      expectedResult: {
        columns: ['?name', '?salary'],
        rows: [
          ['Alice', '200000'],
          ['Bob', '150000'],
          ['Carol', '130000'],
          ['Dave', '110000'],
          ['Frank', '100000'],
        ],
      },
      hints: [
        'Expression clauses like `[(>= ?salary 100000)]` are evaluated after all triple patterns are matched — `?salary` must already be bound.',
        'Eve earns 85,000 and is excluded; Frank earns exactly 100,000 and passes the `>=` check.',
      ],
      successMessage: 'Five employees earning at or above 100,000 retrieved.',
    },
    {
      id: 'o1-s4',
      instruction: `## Step 4: Find recently hired employees

Write a query that finds all employees hired after a given date. Use an expression clause on \`:employee/hired-on\`.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Find employees hired after 2021-01-01
(query [:find ?name ?hired-on
        :where [?emp :employee/name ?name]
               [?emp :employee/hired-on ?hired-on]
               [(> ?hired-on "2021-01-01")]])`,
      hints: [
        'Date strings in ISO 8601 format compare lexicographically — `(> "2022-01-15" "2021-01-01")` is true.',
        'Change the threshold date to narrow or widen the results. Try `"2022-01-01"` to see only Dave, Eve, and Frank.',
      ],
      successMessage: 'You filtered employees by hire date using a string comparison expression.',
    },
  ],
}

export const tutorialOrgChart: Tutorial = {
  id: 'org-chart',
  title: 'Company Org Chart',
  description: 'Model employees, departments, and reporting lines with retroactive salary corrections.',
  goals: 'recursive management-chain rules, retroactive salary corrections, and bi-temporal audit queries',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1],
}
```

- [ ] **Step 4: Verify expected result row order in browser**

```bash
npm run dev
```

Navigate to the Org Chart tutorial → Lesson 1. Run steps 1–3 and compare actual output rows to the `expectedResult` arrays in the code. Adjust row order if they differ.

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests in `lessons.test.ts` PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-org-chart.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add org chart lesson 1 — employee facts and joins"
```

---

## Task 2 — Lesson 2: Bi-temporal history

**Files:**
- Modify: `lib/lessons/tutorial-org-chart.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the existing `describe('org chart tutorial', ...)` block in `__tests__/lib/lessons.test.ts`:

```typescript
describe('lesson 2 — bi-temporal history', () => {
  it('exists with correct id', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-2')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-2')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    orgChart.lessons.find((l) => l.id === 'org-chart-2')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-2')!.steps[3].expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `org-chart-2` not found.

- [ ] **Step 3: Add `lesson2` to `tutorial-org-chart.ts`**

Add after `lesson1`, before the `export const tutorialOrgChart` block:

```typescript
const lesson2: Lesson = {
  id: 'org-chart-2',
  title: 'Bi-temporal history',
  description: 'Use valid-time snapshots to track the reorg and transaction-time queries to audit the retroactive salary correction.',
  steps: [
    {
      id: 'o2-s1',
      instruction: `## Step 1: Query the org chart at two valid-time snapshots

Frank moved from Operations to Engineering on 1 July 2025. This was modelled with two valid-time windows: the pre-reorg fact is valid until 2025-06-30; the post-reorg fact is valid from 2025-07-01.

Run the setup and both queries. \`:valid-at\` answers: *"what department was Frank in on this date?"* — the date selects which valid-time window applies.`,
      starterCode: `${SETUP_L2}

; Pre-reorg: Frank is in Operations
(query [:find ?name ?dept-name
        :valid-at "2025-01-01"
        :where [?emp :employee/name ?name]
               [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]])

; Post-reorg: Frank is in Engineering
(query [:find ?name ?dept-name
        :valid-at "2025-10-01"
        :where [?emp :employee/name ?name]
               [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]])`,
      expectedResult: {
        columns: ['?name', '?dept-name'],
        rows: [
          ['Bob', 'Engineering'],
          ['Carol', 'Marketing'],
          ['Dave', 'Engineering'],
          ['Eve', 'Engineering'],
          ['Frank', 'Engineering'],
        ],
      },
      hints: [
        'The first query (`:valid-at "2025-01-01"`) shows Frank in Operations — the pre-reorg window "2024-01-01"/"2025-06-30" covers that date.',
        'The second query (`:valid-at "2025-10-01"`) shows Frank in Engineering — the post-reorg window from "2025-07-01" covers that date. This is the result the step validates.',
      ],
      successMessage: 'Post-reorg snapshot confirmed: Frank now appears in Engineering.',
    },
    {
      id: 'o2-s2',
      instruction: `## Step 2: Audit the retroactive salary correction

Eve's raise to 95,000 should have applied from 1 April 2025, but it was only recorded in a later transaction.

- \`:as-of 2\` snapshots the database after the initial employee data was loaded (tx 2), before the correction was entered.
- Without \`:as-of\`, the current state reflects the correction.

Both queries use \`:valid-at "2025-05-01"\` to ask about the same real-world date. The difference is *transaction time* — what did the database believe at each point?`,
      starterCode: `${SETUP_L2}

; What did the DB believe before the correction was recorded?
(query [:find ?salary
        :as-of 2
        :valid-at "2025-05-01"
        :where [:eve :employee/salary ?salary]])

; What does the DB say now (correction applied)?
(query [:find ?salary
        :valid-at "2025-05-01"
        :where [:eve :employee/salary ?salary]])`,
      expectedResult: {
        columns: ['?salary'],
        rows: [['95000']],
      },
      hints: [
        '`:as-of 2` shows Eve\'s salary as 85000 — the permanent fact was still in place at transaction 2, before the retract+re-assert in transactions 4–6.',
        'The second query (no `:as-of`) shows 95000 — the correction is now visible. This is the result the step validates.',
      ],
      successMessage: 'Corrected salary 95,000 confirmed. The :as-of query shows what HR believed before the correction.',
    },
    {
      id: 'o2-s3',
      instruction: `## Step 3: Combine both axes

The reorg fact (Frank → Engineering) was recorded at transaction 3. Using \`:as-of 2\` (before the reorg was entered) with \`:valid-at "2025-10-01"\` means the database has no record of Frank being anywhere at that date — the pre-reorg window ended in June, and the post-reorg fact hadn't been asserted yet.

This demonstrates why bi-temporal databases need two independent axes: valid time records *when something was true*; transaction time records *when we knew about it*.`,
      starterCode: `${SETUP_L2}

; At tx 2, did the DB know Frank's post-reorg assignment?
(query [:find ?name ?dept-name
        :as-of 2
        :valid-at "2025-10-01"
        :where [?emp :employee/name ?name]
               [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]])

; Now (all transactions applied): Frank is visible in Engineering
(query [:find ?name ?dept-name
        :valid-at "2025-10-01"
        :where [?emp :employee/name ?name]
               [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]])`,
      expectedResult: {
        columns: ['?name', '?dept-name'],
        rows: [
          ['Bob', 'Engineering'],
          ['Carol', 'Marketing'],
          ['Dave', 'Engineering'],
          ['Eve', 'Engineering'],
          ['Frank', 'Engineering'],
        ],
      },
      hints: [
        'The first query returns 4 rows — Frank is absent because his post-reorg fact (tx 3) hadn\'t been recorded at `:as-of 2`. His pre-reorg window ended 2025-06-30, leaving no coverage for 2025-10-01.',
        'The second query returns 5 rows — all 6 transactions are applied, so Frank\'s post-reorg assignment is visible. This is the result the step validates.',
      ],
      successMessage: 'Both axes confirmed: valid time selects the real-world date; transaction time selects the DB snapshot.',
    },
    {
      id: 'o2-s4',
      instruction: `## Step 4: Model your own temporal scenario

Pick any employee and attribute. Assert an initial value, then assert a corrected value using a different valid-time range in a later transaction. Write two queries — one with \`:as-of\` before the correction, one without — and observe the difference.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

; Assert an initial title for Bob (no valid-time bounds)
(transact [[:bob :employee/title "Senior Engineer"]])

; Later transaction: correct the title retroactively from 2020-06-15
(retract [[:bob :employee/title "Senior Engineer"]])
(transact {:valid-from "2020-06-15"}
  [[:bob :employee/title "VP Engineering"]])

; Query 1: what did the DB say before the correction?
(query [:find ?title
        :as-of 7
        :valid-at "2021-01-01"
        :where [:bob :employee/title ?title]])

; Query 2: what does it say now?
(query [:find ?title
        :valid-at "2021-01-01"
        :where [:bob :employee/title ?title]])`,
      hints: [
        'The pattern is: assert (tx N), retract (tx N+1), re-assert with correct valid-time (tx N+2). `:as-of N` lets you see the state before the correction.',
        'Try modelling a salary change or department transfer — any attribute where the "true" history differs from when it was recorded.',
      ],
      successMessage: 'You modelled a full bi-temporal correction scenario across both time axes.',
    },
  ],
}
```

Update the exported `tutorialOrgChart` to include `lesson2`:

```typescript
lessons: [lesson1, lesson2],
```

- [ ] **Step 4: Verify expected result row order in browser**

```bash
npm run dev
```

Run steps 1–3 of Lesson 2. For steps 1 and 3, check that the first query (`:as-of`) output clearly differs from the second query output. Adjust row order if E2E fails.

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-org-chart.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add org chart lesson 2 — bi-temporal history"
```

---

## Task 3 — Lesson 3: Recursive management chains

**Files:**
- Modify: `lib/lessons/tutorial-org-chart.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('org chart tutorial', ...)`:

```typescript
describe('lesson 3 — recursive management chains', () => {
  it('exists with correct id', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-3')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-3')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    orgChart.lessons.find((l) => l.id === 'org-chart-3')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-3')!.steps[3].expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `org-chart-3` not found.

- [ ] **Step 3: Add `lesson3` to `tutorial-org-chart.ts`**

Add after `lesson2`:

```typescript
const lesson3: Lesson = {
  id: 'org-chart-3',
  title: 'Recursive management chains',
  description: 'Use recursive rules to traverse the full reporting hierarchy in both directions.',
  steps: [
    {
      id: 'o3-s1',
      instruction: `## Step 1: Define a recursive \`reports-to\` rule

A recursive rule has two cases:
- **Base case:** an employee directly reports to a manager via \`:employee/manager\`.
- **Recursive case:** if A's manager is B, and B reports-to C, then A also reports-to C.

Run this to register both rules. The result is empty — rules don't produce output by themselves.`,
      starterCode: `${SETUP}

(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'The second rule is recursive because it calls `(reports-to ?mid ?mgr)` inside its own body.',
        'Rules do not produce query output — they extend the set of derivable facts that queries can use.',
      ],
      successMessage: 'Recursive rules defined.',
    },
    {
      id: 'o3-s2',
      instruction: `## Step 2: Find everyone who reports to Alice

Query all employees who, directly or indirectly, report to Alice. The recursive rule walks the chain: Dave and Eve directly report to Bob, who directly reports to Alice — so Dave and Eve are reachable too.`,
      starterCode: `${SETUP}

(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])

(query [:find ?name
        :where (reports-to ?emp :alice)
               [?emp :employee/name ?name]])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Bob'], ['Carol'], ['Dave'], ['Eve'], ['Frank']],
      },
      hints: [
        'Bob, Carol, and Frank directly report to Alice. Dave and Eve directly report to Bob — but Bob reports to Alice, so the recursive rule derives that Dave and Eve also report to Alice.',
        'All five non-CEO employees are reachable from Alice via the chain.',
      ],
      successMessage: 'All five employees correctly identified as direct or indirect reports of Alice.',
    },
    {
      id: 'o3-s3',
      instruction: `## Step 3: Find everyone in Bob's subtree

Change the anchor from \`:alice\` to \`:bob\`. The rule now traverses only the subtree rooted at Bob.

In the post-reorg state, Frank moved to Engineering under Bob — so Bob's subtree includes Dave, Eve, and Frank.`,
      starterCode: `${SETUP}

(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])

(query [:find ?name
        :where (reports-to ?emp :bob)
               [?emp :employee/name ?name]])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Dave'], ['Eve'], ['Frank']],
      },
      hints: [
        'Dave, Eve, and Frank all have `:employee/manager :bob` directly — so they are immediate results of the base-case rule.',
        'Carol reports to Alice, not Bob, and is correctly excluded. Alice herself is not in anyone\'s reports-to chain.',
      ],
      successMessage: "Bob's subtree: Dave, Eve, and Frank — all three direct reports.",
    },
    {
      id: 'o3-s4',
      instruction: `## Step 4: Combine recursion with transaction-time travel

Use the \`SETUP_L2\` dataset (with the reorg transactions). Query Bob's subtree \`:as-of 2\` (before the reorg was recorded) and compare it to the current state.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])

; Pre-reorg: who reported to Bob at tx 2?
(query [:find ?name
        :as-of 2
        :where (reports-to ?emp :bob)
               [?emp :employee/name ?name]])

; Post-reorg: who reports to Bob now?
(query [:find ?name
        :where (reports-to ?emp :bob)
               [?emp :employee/name ?name]])`,
      hints: [
        'At `:as-of 2`, Frank\'s manager was `:alice` (his pre-reorg valid-time fact covers 2024-01-01 to 2025-06-30 and is the only manager fact in the DB at tx 2). Bob\'s subtree should only contain Dave and Eve.',
        'In the current state, Frank has been recorded as reporting to Bob (tx 3), so Bob\'s subtree gains Frank.',
      ],
      successMessage: 'You combined recursive rules with transaction-time travel to compare org chart snapshots.',
    },
  ],
}
```

Update the exported `lessons` array:

```typescript
lessons: [lesson1, lesson2, lesson3],
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests PASS.

- [ ] **Step 5: Run the E2E test for the org chart lessons added so far**

```bash
npm test -- --testPathPattern=e2e
```

Expected: steps `o3-s2` and `o3-s3` pass (the two steps with non-empty `expectedResult` that the E2E runner will reach). Step `o3-s1` is skipped (empty columns/rows). Step `o3-s4` is skipped (no `expectedResult`). Adjust row order in `expectedResult` if any step fails.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-org-chart.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add org chart lesson 3 — recursive management chains"
```

---

## Task 4 — Lesson 4: Negation

**Files:**
- Modify: `lib/lessons/tutorial-org-chart.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('org chart tutorial', ...)`:

```typescript
describe('lesson 4 — negation', () => {
  it('exists with correct id', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-4')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-4')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    orgChart.lessons.find((l) => l.id === 'org-chart-4')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-4')!.steps[3].expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `org-chart-4` not found.

- [ ] **Step 3: Add `lesson4` to `tutorial-org-chart.ts`**

Add after `lesson3`:

```typescript
const lesson4: Lesson = {
  id: 'org-chart-4',
  title: 'Negation',
  description: 'Use not and not-join to find employees and departments defined by the absence of a relationship.',
  steps: [
    {
      id: 'o4-s1',
      instruction: `## Step 1: Departments with no employees

\`not-join\` excludes an outer binding when a sub-pattern can be satisfied. Here: for each department, check whether there EXISTS an employee whose \`:employee/department\` points to it. If one exists, exclude that department.

The join variable \`[?dept]\` is shared with the outer query; \`?emp\` is existential (private to the body).`,
      starterCode: `${SETUP}

(query [:find ?dept-name
        :where [?dept :dept/name ?dept-name]
               (not-join [?dept]
                         [?emp :employee/department ?dept])])`,
      expectedResult: {
        columns: ['?dept-name'],
        rows: [['Operations'], ['Legal']],
      },
      hints: [
        'Engineering has Bob, Dave, Eve, and Frank. Marketing has Carol. Both are excluded.',
        'Operations and Legal have no employees in the post-reorg dataset (Frank moved to Engineering), so both survive the `not-join`.',
      ],
      successMessage: 'Operations and Legal identified as departments with no employees.',
    },
    {
      id: 'o4-s2',
      instruction: `## Step 2: Employees not assigned to any project

For each employee, use \`not-join\` to exclude anyone who has at least one \`:employee/project\` fact. The wildcard \`?_proj\` matches but is not returned.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?emp :employee/name ?name]
               (not-join [?emp]
                         [?emp :employee/project ?_proj])])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Eve'], ['Frank']],
      },
      hints: [
        'Alice, Bob, Carol, and Dave all have at least one `:employee/project` fact — they are excluded.',
        '`?_proj` is a wildcard variable: it matches any value but is not bound outside the `not-join` body and is not returned.',
      ],
      successMessage: 'Eve and Frank have no project assignments.',
    },
    {
      id: 'o4-s3',
      instruction: `## Step 3: Employees with no manager

Use plain \`not\` to find the employee who has no \`:employee/manager\` fact. All variables inside \`not\` must already be bound by the outer query.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?emp :employee/name ?name]
               (not [?emp :employee/manager ?_mgr])])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Alice']],
      },
      hints: [
        'Plain `not` works here because there are no unbound inner-only variables — `?emp` is already bound by the outer clause, and `?_mgr` is a wildcard that just needs to match anything.',
        'Alice is the only employee with no `:employee/manager` fact, making her the root of the hierarchy.',
      ],
      successMessage: 'Alice identified as the sole employee with no manager.',
    },
    {
      id: 'o4-s4',
      instruction: `## Step 4: Engineering employees not on Project Alpha

Write a query that finds Engineering employees who have no assignment to \`:proj-alpha\`. Use \`not-join\` because the inner variable (\`?_proj\`) is fresh.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?emp :employee/department :eng]
               [?emp :employee/name ?name]
               (not-join [?emp]
                         [?emp :employee/project :proj-alpha])])`,
      hints: [
        'Bob is in Engineering and is assigned to `:proj-alpha` — he should be excluded.',
        'Dave, Eve, and Frank are in Engineering. Dave is on `:proj-beta` (not `:proj-alpha`); Eve and Frank have no project at all. All three should appear.',
      ],
      successMessage: 'You used not-join to find Engineering employees without a specific project assignment.',
    },
  ],
}
```

Update the exported `lessons` array:

```typescript
lessons: [lesson1, lesson2, lesson3, lesson4],
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/lessons/tutorial-org-chart.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add org chart lesson 4 — negation"
```

---

## Task 5 — Lesson 5: Aggregates

**Files:**
- Modify: `lib/lessons/tutorial-org-chart.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing tests**

Add inside `describe('org chart tutorial', ...)`:

```typescript
describe('lesson 5 — aggregates', () => {
  it('exists with correct id', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-5')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-5')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    orgChart.lessons.find((l) => l.id === 'org-chart-5')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(orgChart.lessons.find((l) => l.id === 'org-chart-5')!.steps[3].expectedResult).toBeUndefined()
  })
})

// Final structural tests — pass only once all 5 lessons are present
it('has exactly 5 lessons', () => {
  expect(orgChart.lessons).toHaveLength(5)
})

it('step IDs are unique within org chart tutorial', () => {
  const ids = orgChart.lessons.flatMap((l) => l.steps.map((s) => s.id))
  expect(ids.length).toBe(new Set(ids).size)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `org-chart-5` not found and `lessons` has length 4.

- [ ] **Step 3: Add `lesson5` to `tutorial-org-chart.ts`**

Add after `lesson4`:

```typescript
const lesson5: Lesson = {
  id: 'org-chart-5',
  title: 'Aggregates',
  description: 'Use count, sum, and max to compute headcount and payroll figures grouped by department.',
  steps: [
    {
      id: 'o5-s1',
      instruction: `## Step 1: Headcount per department

\`(count ?emp)\` in \`:find\` counts rows. Minigraf groups by all plain variables in \`:find\` — here \`?dept-name\` — and counts within each group.

Alice has no \`:employee/department\` and is excluded from the join. Empty departments (\`:ops\`, \`:legal\`) produce no rows because the join requires at least one matching employee.`,
      starterCode: `${SETUP}

(query [:find ?dept-name (count ?emp)
        :where [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]])`,
      expectedResult: {
        columns: ['?dept-name', '(count ?emp)'],
        rows: [
          ['Engineering', '4'],
          ['Marketing', '1'],
        ],
      },
      hints: [
        'Engineering has Bob, Dave, Eve, and Frank — count is 4. Marketing has only Carol — count is 1.',
        'Operations and Legal have no employees, so no rows match the join and they do not appear in the result.',
      ],
      successMessage: 'Headcount per department: Engineering 4, Marketing 1.',
    },
    {
      id: 'o5-s2',
      instruction: `## Step 2: Total payroll per department

Replace \`(count ?emp)\` with \`(sum ?salary)\`. Join employee to department, bind \`?salary\`, and the aggregate sums all salaries within each department group.`,
      starterCode: `${SETUP}

(query [:find ?dept-name (sum ?salary)
        :where [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]
               [?emp :employee/salary ?salary]])`,
      expectedResult: {
        columns: ['?dept-name', '(sum ?salary)'],
        rows: [
          ['Engineering', '445000'],
          ['Marketing', '130000'],
        ],
      },
      hints: [
        'Engineering: Bob 150,000 + Dave 110,000 + Eve 85,000 + Frank 100,000 = 445,000.',
        'Marketing: Carol 130,000. Alice is excluded because she has no department.',
      ],
      successMessage: 'Total payroll: Engineering 445,000, Marketing 130,000.',
    },
    {
      id: 'o5-s3',
      instruction: `## Step 3: Highest salary per department

Swap \`sum\` for \`max\` on the same join path. \`(max ?salary)\` returns the highest salary within each department group.`,
      starterCode: `${SETUP}

(query [:find ?dept-name (max ?salary)
        :where [?emp :employee/department ?dept]
               [?dept :dept/name ?dept-name]
               [?emp :employee/salary ?salary]])`,
      expectedResult: {
        columns: ['?dept-name', '(max ?salary)'],
        rows: [
          ['Engineering', '150000'],
          ['Marketing', '130000'],
        ],
      },
      hints: [
        'Bob earns 150,000 — the highest in Engineering. Carol earns 130,000 — the only salary in Marketing.',
        '`max` does not need `:with` — duplicate values do not affect the maximum.',
      ],
      successMessage: 'Max salary per department: Engineering 150,000 (Bob), Marketing 130,000 (Carol).',
    },
    {
      id: 'o5-s4',
      instruction: `## Step 4: Parameterise by department

The queries above return all departments at once. A common pattern is to fix one variable to a specific keyword to query a single department — a "parameterised" query.

Rewrite the headcount query to return only Engineering's count by replacing \`?dept\` with the keyword literal \`:eng\`. Then try \`:mktg\`.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Headcount for Engineering only
(query [:find (count ?emp)
        :where [?emp :employee/department :eng]])

; Headcount for Marketing only
(query [:find (count ?emp)
        :where [?emp :employee/department :mktg]])`,
      hints: [
        'Replacing the department variable with a keyword literal is all you need — the department entity never has to be resolved to its name since you already know which department you want.',
        'Try the same pattern with `(sum ?salary)` or `(max ?salary)` to compute department-specific payroll and top salary.',
      ],
      successMessage: 'You parameterised a query by swapping the department keyword literal.',
    },
  ],
}
```

Update the exported `tutorialOrgChart` to include all five lessons:

```typescript
export const tutorialOrgChart: Tutorial = {
  id: 'org-chart',
  title: 'Company Org Chart',
  description: 'Model employees, departments, and reporting lines with retroactive salary corrections.',
  goals: 'recursive management-chain rules, retroactive salary corrections, and bi-temporal audit queries',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1, lesson2, lesson3, lesson4, lesson5],
}
```

- [ ] **Step 4: Verify expected result row order in browser**

```bash
npm run dev
```

Run steps 1–3 of Lesson 5. Numeric aggregates may appear with or without a decimal point depending on the WASM output — match the exact string representation in `expectedResult`.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: ALL tests pass — including the two new structural tests (`has exactly 5 lessons`, `step IDs are unique`).

- [ ] **Step 6: Run the full E2E test suite**

```bash
npm test -- --testPathPattern=e2e
```

Expected: all non-open-ended, non-mutation-only steps across the entire org chart tutorial pass. If any step fails due to row order or numeric format, adjust `expectedResult` in the code and re-run.

- [ ] **Step 7: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, no build failures.

- [ ] **Step 8: Commit**

```bash
git add lib/lessons/tutorial-org-chart.ts __tests__/lib/lessons.test.ts
git commit -m "feat: fill in Org Chart tutorial (issue #29)"
```
