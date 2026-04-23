import type { Lesson } from '@/lib/types'

export const lesson3: Lesson = {
  id: 'lesson-3',
  title: 'Recursive rules',
  description: 'Use recursive rules to compute transitive relationships.',
  steps: [
    {
      id: 'l3-s1',
      instruction: `## Step 1: Define a base case and recursive rule\n\nThe \`reachable\` relationship is transitive. If A connects to B, A reaches B. If A connects to C and C reaches B, then A also reaches B.\n\nRun this setup to register both rules.`,
      starterCode: `(transact [[:a :connected :b]
           [:b :connected :c]
           [:c :connected :d]])

(rule [(reachable ?from ?to) [?from :connected ?to]])
(rule [(reachable ?from ?to) [?from :connected ?mid] (reachable ?mid ?to)])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'The first rule is the base case.',
        'The second rule is recursive because it references `reachable` inside its own body.',
      ],
      successMessage: 'Recursive rules defined.',
    },
    {
      id: 'l3-s2',
      instruction: `## Step 2: Query the transitive closure\n\nNow find every node reachable from \`:a\`. The recursive rule should walk the whole chain.`,
      starterCode: `(transact [[:a :connected :b]
           [:b :connected :c]
           [:c :connected :d]])

(rule [(reachable ?from ?to) [?from :connected ?to]])
(rule [(reachable ?from ?to) [?from :connected ?mid] (reachable ?mid ?to)])

(query [:find ?dest
        :where (reachable :a ?dest)])`,
      expectedResult: { columns: ['?dest'], rows: [[':b'], [':c'], [':d']] },
      hints: [
        'This query should return direct and indirect destinations.',
        'Recursive Datalog computes a fixed point, not a stack-based loop.',
      ],
      successMessage: 'Transitive closure computed.',
    },
    {
      id: 'l3-s3',
      instruction: `## Step 3: Observe safe termination with a cycle\n\nAdd a cycle from \`:d\` back to \`:a\`, then rerun the reachability query. Minigraf should still terminate safely.`,
      starterCode: `(transact [[:a :connected :b]
           [:b :connected :c]
           [:c :connected :d]
           [:d :connected :a]])

(rule [(reachable ?from ?to) [?from :connected ?to]])
(rule [(reachable ?from ?to) [?from :connected ?mid] (reachable ?mid ?to)])

(query [:find ?dest
        :where (reachable :a ?dest)])`,
      expectedResult: { columns: ['?dest'], rows: [[':a'], [':b'], [':c'], [':d']] },
      hints: [
        'Because of the cycle, `:a` can now reach itself through the graph.',
        'The key point is that Minigraf stops once no new facts can be derived.',
      ],
      successMessage: 'Correct. Minigraf terminates safely even when the graph contains cycles.',
    },
    {
      id: 'l3-s4',
      instruction: `## Step 4: Model a hierarchy\n\nCreate your own hierarchy or graph with at least four nodes, write a recursive reachability rule, and query it.\n\nThis step is open-ended — the tutor will give feedback.`,
      starterCode: `(transact [[:intern :reports-to :manager]
           [:manager :reports-to :director]
           [:director :reports-to :vp]
           [:vp :reports-to :cto]])

; Your recursive rule here

; Your query here`,
      hints: [
        'An org chart, file tree, or category graph all work well here.',
        'Reuse the base-case + recursive-case pattern from the earlier steps.',
      ],
      successMessage: 'You built a recursive query over your own hierarchy.',
    },
  ],
}
