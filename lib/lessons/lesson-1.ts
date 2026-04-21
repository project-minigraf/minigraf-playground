import type { Lesson } from '@/lib/types'

export const lesson1: Lesson = {
  id: 'lesson-1',
  title: 'Basic facts and queries',
  description: 'Learn to assert facts and run simple queries in Minigraf Datalog.',
  steps: [
    {
      id: 'l1-s1',
      instruction: `## Step 1: Assert some facts\n\nIn Datalog, facts are statements that are unconditionally true.\n\nThe code below asserts friendship relationships. Run it to assert these facts.`,
      starterCode: `friend(alice, bob).\nfriend(alice, carol).\nfriend(bob, dave).`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'Hit the ▶ Run button to assert the facts.',
        'Facts have the form: predicate(arg1, arg2). — note the trailing period.',
      ],
      successMessage: 'Facts asserted! The graph now knows about these friendships.',
    },
    {
      id: 'l1-s2',
      instruction: `## Step 2: Query a specific fact\n\nNow look up whether alice and bob are friends.\n\nA query starts with \`?-\`.`,
      starterCode: `?- friend(alice, bob).`,
      expectedResult: { columns: [], rows: [[]] },
      hints: ['Queries start with ?- and end with a period.'],
      successMessage: 'Correct! The query confirmed alice and bob are friends.',
    },
    {
      id: 'l1-s3',
      instruction: `## Step 3: Query with a variable\n\nVariables start with \`?\`. Use a variable to find all friends of alice.`,
      starterCode: `?- friend(alice, ?who).`,
      expectedResult: { columns: ['?who'], rows: [['bob'], ['carol']] },
      hints: [
        'Variables like ?who match any value.',
        'The result should be a table with one column (?who) and two rows.',
      ],
      successMessage: "You found all of Alice's friends using a variable query!",
    },
    {
      id: 'l1-s4',
      instruction: `## Step 4: Model your own dataset\n\nAssert at least 3 facts of your own choosing — anything you like (movies, cities, colleagues). Then write a query to retrieve one of them using a variable.\n\nThis step is open-ended — the tutor will give feedback.`,
      starterCode: `% Your facts here\n\n% Your query here`,
      hints: [
        "Try: likes(alice, jazz). likes(alice, hiking). likes(bob, jazz).",
        "Then query: ?- likes(alice, ?activity). to find all of Alice's interests.",
      ],
      successMessage: "Great work! You've modelled your own dataset.",
    },
  ],
}