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
           [:frank :employee/department :ops "2024-01-01" "2025-06-30"]
           [:frank :employee/manager :alice "2024-01-01" "2025-06-30"]])

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

export const tutorialOrgChart: Tutorial = {
  id: 'org-chart',
  title: 'Company Org Chart',
  description: 'Model employees, departments, and reporting lines with retroactive salary corrections.',
  goals: 'recursive management-chain rules, retroactive salary corrections, and bi-temporal audit queries',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1],
}

export { SETUP_L2 }
