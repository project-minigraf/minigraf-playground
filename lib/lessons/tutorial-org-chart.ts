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
// Eve salary starts permanent then is corrected retroactively with a retract and bounded asserts,
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
           [:frank :employee/department :ops {:valid-from "2024-01-01" :valid-to "2025-06-30"}]
           [:frank :employee/manager :alice {:valid-from "2024-01-01" :valid-to "2025-06-30"}]])

; Frank post-reorg: moves to Engineering under Bob (valid from 2025-07-01)
(transact {:valid-from "2025-07-01"}
  [[:frank :employee/department :eng]
   [:frank :employee/manager :bob]])

; Eve salary correction: raise should have applied from 2025-04-01
; but was only recorded in a later transaction (retract + two bounded asserts below)
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

const lesson2: Lesson = {
  id: 'org-chart-2',
  title: 'Bi-temporal history',
  description:
    'Understand when to use valid time (what was true in the world) versus transaction time (what did the database believe), and how to combine both axes for complete temporal audits.',
  steps: [
    {
      id: 'o2-s1',
      instruction: `## Step 1: Query the world at a point in time with \`:valid-at\`

\`:valid-at "date"\` answers "what was true in the world on this date?" It filters every triple to only those whose valid-time window covers the given date.

Frank was reorganised mid-2025: before July 2025 he was in Operations reporting to Alice; from July 2025 onwards he is in Engineering reporting to Bob. The two queries below show the difference.`,
      starterCode: `${SETUP_L2}

; Pre-reorg: Frank in Operations under Alice
(query [:find ?dept ?manager
        :valid-at "2025-01-01"
        :where [:frank :employee/department ?dept]
               [:frank :employee/manager ?manager]])

; Post-reorg: Frank in Engineering under Bob
(query [:find ?dept ?manager
        :valid-at "2025-10-01"
        :where [:frank :employee/department ?dept]
               [:frank :employee/manager ?manager]])`,
      expectedResult: {
        columns: ['?dept', '?manager'],
        rows: [[':eng', ':bob']],
      },
      hints: [
        'The per-fact valid-time tuple `[:frank :employee/department :ops "2024-01-01" "2025-06-30"]` is only visible when `:valid-at` falls inside that window.',
        'The open-ended fact `(transact {:valid-from "2025-07-01"} ...)` has no valid-to bound, so it covers all dates from 2025-07-01 onwards.',
      ],
      successMessage: 'Post-reorg snapshot returned: Frank is in :eng reporting to :bob.',
    },
    {
      id: 'o2-s2',
      instruction: `## Step 2: Query what the database believed with \`:as-of\`

\`:as-of N\` answers "what did the database believe after transaction N?" It replays the log up to that transaction count, ignoring later corrections.

Eve's salary was recorded as 85,000 permanently in transaction 2. Transactions 4–6 later corrected this: the 85,000 fact was retracted and replaced with two bounded facts (85,000 until 2025-03-31, 95,000 from 2025-04-01). The queries below show the before and after.`,
      starterCode: `${SETUP_L2}

; What the DB believed at tx 2 (before the correction)
(query [:find ?salary
        :as-of 2
        :valid-at "2025-05-01"
        :where [:eve :employee/salary ?salary]])

; Current belief (after the correction)
(query [:find ?salary
        :valid-at "2025-05-01"
        :where [:eve :employee/salary ?salary]])`,
      expectedResult: {
        columns: ['?salary'],
        rows: [['95000']],
      },
      hints: [
        '`:as-of 2` replays only the first 2 transactions, so the retract (tx 4) and bounded re-asserts (tx 5–6) have not been applied yet — the original 85,000 is still permanent.',
        'The current (no `:as-of`) view sees all 6 transactions: the 85,000 permanent fact was retracted and replaced, so only the bounded 95,000 fact covers 2025-05-01.',
      ],
      successMessage: 'Current corrected salary of 95,000 confirmed; before correction the DB believed 85,000.',
    },
    {
      id: 'o2-s3',
      instruction: `## Step 3: Combine both axes for a full temporal audit

Combining \`:as-of N\` with \`:valid-at "date"\` lets you ask "what did the database believe at transaction N about the world on date D?" — the gold standard for temporal audits and compliance checks.

The queries below show Frank's department at a specific valid-time date, both through the lens of an early transaction snapshot and through the current view.`,
      starterCode: `${SETUP_L2}

; At tx 2, the post-reorg transaction (tx 3) had not yet been applied.
; Frank's only pre-reorg window ends 2025-06-30, so 2025-10-01 is outside it → empty.
(query [:find ?dept
        :as-of 2
        :valid-at "2025-10-01"
        :where [:frank :employee/department ?dept]])

; Current view: tx 3 has been applied, Frank is in :eng from 2025-07-01 onwards.
(query [:find ?dept
        :valid-at "2025-10-01"
        :where [:frank :employee/department ?dept]])`,
      expectedResult: {
        columns: ['?dept'],
        rows: [[':eng']],
      },
      hints: [
        'At `:as-of 2`, the database only knows about transactions 1 and 2. Transaction 3 (the post-reorg open-ended fact) has not been applied, so no dept fact covers 2025-10-01.',
        'The current view includes all 6 transactions. Transaction 3 asserted `:frank :employee/department :eng` from 2025-07-01 with no valid-to, so it covers 2025-10-01.',
      ],
      successMessage: 'Bi-temporal audit complete: empty at tx-2 snapshot, :eng in the current view.',
    },
    {
      id: 'o2-s4',
      instruction: `## Step 4: Model your own time-windowed fact (open-ended)

Add a new employee or update an existing one with a time-windowed fact, then write queries that show different results at different valid-time dates.

Try adding a second department transfer, a salary change, or a project assignment with a specific valid-time window. Use \`:valid-at\` to verify the before and after snapshots.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

; Example: assert a fact with a valid-time window
; (transact {:valid-from "2026-01-01"} [[:frank :employee/salary 120000]])

; Then query at two dates to see the difference
; (query [:find ?salary :valid-at "2025-12-31" :where [:frank :employee/salary ?salary]])
; (query [:find ?salary :valid-at "2026-02-01" :where [:frank :employee/salary ?salary]])`,
      hints: [
        'Use `(transact {:valid-from "date"} [...])` or `(transact {:valid-from "date" :valid-to "date"} [...])` to add a bounded fact.',
        'Query the same attribute at a date before and after your window to verify that the fact is only visible within its valid-time range.',
      ],
      successMessage: 'You modelled a time-windowed fact and verified it with valid-at queries.',
    },
  ],
}

const lesson3: Lesson = {
  id: 'org-chart-3',
  title: 'Recursive management chains',
  description: 'Use recursive rules to traverse the full reporting hierarchy in both directions.',
  steps: [
    {
      id: 'o3-s1',
      instruction: `## Step 1: Define the recursive \`reports-to\` rule

Rules let you derive new facts from existing ones. The two rules below together define \`reports-to\` recursively:

- **Base case** — the first rule says "?emp reports-to ?mgr if there is a direct \`:employee/manager\` fact between them."
- **Recursive case** — the second rule says "?emp reports-to ?mgr if ?emp has a direct manager ?mid, and ?mid reports-to ?mgr." This walks up the management chain any number of levels.

Running only rules produces no result rows — rules register derived predicates but do not return data on their own. You query derived predicates in a separate \`(query ...)\` call.`,
      starterCode: `${SETUP}

(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'The base case anchors the recursion: a direct `:employee/manager` fact is the simplest form of reports-to.',
        'Running rules alone returns no rows — the rules define derived predicates. Add a `(query ...)` in the next step to see results.',
      ],
      successMessage: 'Rules registered — the recursive reports-to predicate is now available for querying.',
    },
    {
      id: 'o3-s2',
      instruction: `## Step 2: Who reports to Alice (direct and indirect)?

Now query the derived \`reports-to\` predicate. Because the rule is recursive, it walks the full chain upward — not just direct reports.

All five non-CEO employees ultimately report to Alice.`,
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
        'Bob and Carol are direct reports to Alice (base case). Dave, Eve, and Frank report to Bob, who reports to Alice — the recursive case covers them.',
        'The literal `:alice` in `(reports-to ?emp :alice)` binds the manager position, so only employees whose chain ends at Alice are returned.',
      ],
      successMessage: 'All five non-CEO employees returned — the recursive rule traverses the full hierarchy.',
    },
    {
      id: 'o3-s3',
      instruction: `## Step 3: Who is in Bob's subtree?

Use \`reports-to\` with \`:bob\` as the manager to find everyone who falls under Bob in the hierarchy.

Dave, Eve, and Frank all report directly to Bob, so only the base case fires here. But if Bob had indirect reports, the recursive case would include them too.`,
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
        'Dave, Eve, and Frank each have `:employee/manager :bob` — the base case of the rule matches all three directly.',
        'Bob reports to Alice, not to himself, so Bob is not in his own subtree.',
      ],
      successMessage: "Bob's subtree: Dave, Eve, and Frank.",
    },
    {
      id: 'o3-s4',
      instruction: `## Step 4: Combine recursion with temporal queries (open-ended)

Before the 2025 reorg, Frank reported to Alice (via Operations). After the reorg he reports to Bob (via Engineering).

Using \`${SETUP_L2}\` and the same recursive rule, explore how the reporting chain changes over time. For example:
- Who reported to Alice at \`:valid-at "2025-01-01"\`?
- Who is in Bob's subtree at \`:valid-at "2025-10-01"\`?

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

; Add the recursive rule
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mgr]])
(rule [(reports-to ?emp ?mgr) [?emp :employee/manager ?mid] (reports-to ?mid ?mgr)])

; Try a temporal query — e.g. who reported to Alice before the reorg?
; (query [:find ?name
;         :valid-at "2025-01-01"
;         :where (reports-to ?emp :alice)
;                [?emp :employee/name ?name]])`,
      hints: [
        'At `:valid-at "2025-01-01"` Frank was in Operations reporting to Alice — the base case should include him as a direct report.',
        'At `:valid-at "2025-10-01"` Frank is in Engineering under Bob, so he appears in Bob\'s subtree but reaches Alice only via the recursive case (Frank → Bob → Alice).',
      ],
      successMessage: 'You combined recursive rules with temporal queries to audit the reporting chain across time.',
    },
  ],
}

export const tutorialOrgChart: Tutorial = {
  id: 'org-chart',
  title: 'Company Org Chart',
  description: 'Model employees, departments, and reporting lines with retroactive salary corrections.',
  goals: 'recursive management-chain rules, retroactive salary corrections, and bi-temporal audit queries',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1, lesson2, lesson3],
}

export { SETUP_L2 }
