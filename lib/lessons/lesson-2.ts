import type { Lesson } from '@/lib/types'

export const lesson2: Lesson = {
  id: 'lesson-2',
  title: 'Rules and inference',
  description: 'Define rules that derive new facts from base data.',
  steps: [
    {
      id: 'l2-s1',
      instruction: `## Step 1: Define a simple rule\n\nRules let Minigraf derive facts without storing them directly.\n\nRun this code to assert two humans and register a rule that says every human is mortal.`,
      starterCode: `(transact [[:socrates :kind :human]
           [:plato :kind :human]])

(rule [(mortal ?who) [?who :kind :human]])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'Rules use the form `(rule [(head ...) body-clause...])`.',
        'The body clause here is a normal triple pattern: `[?who :kind :human]`.',
      ],
      successMessage: 'Rule defined. Minigraf can now derive mortal facts from the human data.',
    },
    {
      id: 'l2-s2',
      instruction: `## Step 2: Query a derived fact\n\nNow query all mortals. The rule should derive them from the human facts.`,
      starterCode: `(transact [[:socrates :kind :human]
           [:plato :kind :human]])

(rule [(mortal ?who) [?who :kind :human]])

(query [:find ?who
        :where (mortal ?who)])`,
      expectedResult: { columns: ['?who'], rows: [[':plato'], [':socrates']] },
      hints: [
        'You query a derived predicate the same way you query a base relation.',
        'The body of the query is `(mortal ?who)`, not a triple pattern.',
      ],
      successMessage: 'Inference working. The mortal facts were derived by the rule rather than asserted directly.',
    },
    {
      id: 'l2-s3',
      instruction: `## Step 3: Chain two rules\n\nAdd a second rule that says philosophers are humans who are mortal, then query all philosophers.`,
      starterCode: `(transact [[:socrates :kind :human]
           [:plato :kind :human]])

(rule [(mortal ?who) [?who :kind :human]])
(rule [(philosopher ?who) (mortal ?who) [?who :kind :human]])

(query [:find ?who
        :where (philosopher ?who)])`,
      expectedResult: { columns: ['?who'], rows: [[':plato'], [':socrates']] },
      hints: [
        'A rule body can mix derived predicates like `(mortal ?who)` and triple patterns.',
        'This is rule chaining: one derived predicate feeds another.',
      ],
      successMessage: 'Rule chaining works. Minigraf composed the two rules to derive philosophers.',
    },
    {
      id: 'l2-s4',
      instruction: `## Step 4: Write your own rule\n\nCreate a small dataset and write a rule that derives a new predicate from it. Then query that derived predicate.\n\nThis step is open-ended — the tutor will give feedback.`,
      starterCode: `(transact [[:ada :works-at :acme]
           [:grace :works-at :acme]
           [:linus :works-at :kernel-labs]])

; Your rule here

; Your query here`,
      hints: [
        'Example idea: derive coworkers from a shared workplace.',
        'A good pattern is to assert facts first, define a rule, then end with a `(query ...)`.',
      ],
      successMessage: 'You wrote your own derived predicate.',
    },
  ],
}
