import type { Lesson } from '@/lib/types'

export const lesson1: Lesson = {
  id: 'lesson-1',
  title: 'Basic facts and queries',
  description: 'Learn to assert facts and run simple queries in Minigraf Datalog.',
  steps: [
    {
      id: 'l1-s1',
      instruction: `## Step 1: Assert some facts\n\nMinigraf stores facts as triples: \`[entity attribute value]\`.\n\nRun this transaction to add a few friendship edges to the graph.`,
      starterCode: `(transact [[:alice :friend :bob]
           [:alice :friend :carol]
           [:bob :friend :dave]])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'Hit the ▶ Run button to execute the transaction.',
        'Facts are triples like `[:alice :friend :bob]` inside `(transact [...])`.',
      ],
      successMessage: 'Facts asserted! The graph now knows about these friendships.',
    },
    {
      id: 'l1-s2',
      instruction: `## Step 2: Query a specific fact\n\nNow look up Alice's friendship edge and restrict the result to Bob.`,
      starterCode: `(query [:find ?friend
        :where [:alice :friend ?friend]
               [(= ?friend :bob)]])`,
      expectedResult: { columns: ['?friend'], rows: [[':bob']] },
      hints: [
        'Queries use `(query [...])`, not `?-`.',
        'You can keep only Bob with the predicate `[(= ?friend :bob)]`.',
      ],
      successMessage: 'Correct! The query found Bob as the matching friend.',
    },
    {
      id: 'l1-s3',
      instruction: `## Step 3: Query with a variable\n\nVariables start with \`?\`. Use one to find all of Alice's friends.`,
      starterCode: `(query [:find ?who
        :where [:alice :friend ?who]])`,
      expectedResult: { columns: ['?who'], rows: [[':bob'], [':carol']] },
      hints: [
        'Variables like ?who match any value.',
        'The result should be a table with one column (`?who`) and two rows.',
      ],
      successMessage: "You found all of Alice's friends using a variable query!",
    },
    {
      id: 'l1-s4',
      instruction: `## Step 4: Model your own dataset\n\nWrite a transaction with at least 3 facts of your own choosing, then add a query that retrieves some of that data with a variable.\n\nThis step is open-ended — the tutor will give feedback.`,
      starterCode: `(transact [[:movie/inception :title "Inception"]
           [:movie/inception :genre :sci-fi]
           [:movie/arrival :genre :sci-fi]])

(query [:find ?movie
        :where [?movie :genre :sci-fi]])`,
      hints: [
        'Try a small movie, city, or hobby dataset using triples.',
        'Then query it with a variable like `?movie` or `?city`.',
      ],
      successMessage: "Great work! You've modelled your own dataset.",
    },
  ],
}
