import type { Lesson } from '@/lib/types'

export const lesson4: Lesson = {
  id: 'lesson-4',
  title: 'Bi-temporal time travel',
  description: 'Use valid-time ranges and time-travel queries to inspect historical state.',
  steps: [
    {
      id: 'l4-s1',
      instruction: `## Step 1: Assert a fact with a valid-time range\n\nMinigraf tracks both transaction time and valid time. Run this transaction to say Alice worked at Acme from 2020 through 2023.`,
      starterCode: `(transact {:valid-from "2020-01-01" :valid-to "2023-12-31"}
  [[:alice :company :acme]])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'Use `(transact {:valid-from "...\" :valid-to "..."} [facts])` for valid-time assertions.',
        'The valid-time range describes when the fact was true in the world.',
      ],
      successMessage: 'Temporal fact asserted.',
    },
    {
      id: 'l4-s2',
      instruction: `## Step 2: Query a past valid-time snapshot\n\nWas Alice at Acme on July 1, 2021? Query the graph at that valid date.`,
      starterCode: `(transact {:valid-from "2020-01-01" :valid-to "2023-12-31"}
  [[:alice :company :acme]])

(query [:find ?company
        :valid-at "2021-07-01"
        :where [:alice :company ?company]])`,
      expectedResult: { columns: ['?company'], rows: [[':acme']] },
      hints: [
        'Use the `:valid-at` modifier inside the query.',
        'Because 2021 falls inside the asserted range, the fact should be visible.',
      ],
      successMessage: 'You successfully queried a past valid-time view.',
    },
    {
      id: 'l4-s3',
      instruction: `## Step 3: Make a retroactive correction\n\nSuppose Alice actually left on June 30, 2022. Record a correction in a later transaction, then ask what the graph says for a 2023 valid date right now.`,
      starterCode: `(transact {:valid-from "2020-01-01" :valid-to "2023-12-31"}
  [[:alice :company :acme]])

(retract [[:alice :company :acme "2020-01-01" "2023-12-31"]])
(transact {:valid-from "2020-01-01" :valid-to "2022-06-30"}
  [[:alice :company :acme]])

(query [:find ?company
        :valid-at "2023-07-01"
        :where [:alice :company ?company]])`,
      expectedResult: { columns: ['?company'], rows: [] },
      hints: [
        'A correction is modeled as a later transaction that retracts the old valid-time fact and asserts the corrected one.',
        'After the correction, Alice should no longer appear at Acme for dates in 2023.',
      ],
      successMessage: 'Retroactive correction applied.',
    },
    {
      id: 'l4-s4',
      instruction: `## Step 4: Compare history with transaction time\n\nUse \`:as-of\` to ask what the database believed before the correction was recorded.`,
      starterCode: `(transact {:valid-from "2020-01-01" :valid-to "2023-12-31"}
  [[:alice :company :acme]])

(retract [[:alice :company :acme "2020-01-01" "2023-12-31"]])
(transact {:valid-from "2020-01-01" :valid-to "2022-06-30"}
  [[:alice :company :acme]])

(query [:find ?company
        :as-of 1
        :valid-at "2023-07-01"
        :where [:alice :company ?company]])`,
      expectedResult: { columns: ['?company'], rows: [[':acme']] },
      hints: [
        '`:as-of 1` asks for the graph as it looked after the first transaction, before the correction.',
        'This is the difference between “what is true now” and “what did we believe then”.',
      ],
      successMessage: 'You used transaction-time travel to inspect the pre-correction view.',
    },
    {
      id: 'l4-s5',
      instruction: `## Step 5: Model your own correction scenario\n\nCreate a small scenario where something was recorded incorrectly and later corrected. Query both the current view and an earlier \`:as-of\` view.\n\nThis step is open-ended — the tutor will give feedback.`,
      starterCode: `(transact {:valid-from "2024-01-01" :valid-to "2024-12-31"}
  [[:project-x :owner :alice]])

; Add a corrective transaction here

; Add a current-view query here

; Add an :as-of query here`,
      hints: [
        'Project ownership, prices, or job assignments all make good correction scenarios.',
        'Show both the corrected present view and an earlier `:as-of` view to highlight the two time axes.',
      ],
      successMessage: 'You modeled a full bi-temporal correction scenario.',
    },
  ],
}
