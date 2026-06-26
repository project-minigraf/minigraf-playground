import type { Lesson, Tutorial } from '@/lib/types'

// Five clubs — Rovers and Athletic have no wins (drives negation lesson)
// Leo and Sofia have :player/prev-club facts for recursive transfer-chain lesson
const SETUP = `; Clubs
(transact [[:united :club/name "FC United"]
           [:city :club/name "City FC"]
           [:rovers :club/name "Rovers FC"]
           [:athletic :club/name "Athletic FC"]
           [:wanderers :club/name "Wanderers FC"]])

; Players — Nina has no :player/goals fact (drives negation)
; Leo and Sofia carry :player/prev-club for the transfer-chain lesson
(transact [[:marco :player/name "Marco"]
           [:marco :player/club :united]
           [:marco :player/goals 3]
           [:julia :player/name "Julia"]
           [:julia :player/club :united]
           [:julia :player/goals 1]
           [:leo :player/name "Leo"]
           [:leo :player/club :city]
           [:leo :player/prev-club :united]
           [:leo :player/goals 2]
           [:sofia :player/name "Sofia"]
           [:sofia :player/club :rovers]
           [:sofia :player/prev-club :city]
           [:sofia :player/goals 2]
           [:kai :player/name "Kai"]
           [:kai :player/club :athletic]
           [:kai :player/goals 1]
           [:omar :player/name "Omar"]
           [:omar :player/club :wanderers]
           [:omar :player/goals 1]
           [:nina :player/name "Nina"]
           [:nina :player/club :wanderers]])
           ; Nina has no :player/goals fact

; Matches — :match/winner absent for draw (:m4 ended 1-1)
; Rovers and Athletic never win (drives negation lesson)
(transact [[:m1 :match/home :united]
           [:m1 :match/away :city]
           [:m1 :match/home-goals 3]
           [:m1 :match/away-goals 1]
           [:m1 :match/date "2025-03-15"]
           [:m1 :match/winner :united]
           [:m2 :match/home :rovers]
           [:m2 :match/away :united]
           [:m2 :match/home-goals 0]
           [:m2 :match/away-goals 2]
           [:m2 :match/date "2025-03-22"]
           [:m2 :match/winner :united]
           [:m3 :match/home :city]
           [:m3 :match/away :athletic]
           [:m3 :match/home-goals 2]
           [:m3 :match/away-goals 0]
           [:m3 :match/date "2025-04-05"]
           [:m3 :match/winner :city]
           [:m4 :match/home :wanderers]
           [:m4 :match/away :rovers]
           [:m4 :match/home-goals 1]
           [:m4 :match/away-goals 1]
           [:m4 :match/date "2025-04-12"]
           ; no :match/winner — draw
           [:m5 :match/home :athletic]
           [:m5 :match/away :wanderers]
           [:m5 :match/home-goals 1]
           [:m5 :match/away-goals 2]
           [:m5 :match/date "2025-04-19"]
           [:m5 :match/winner :wanderers]
           [:m6 :match/home :united]
           [:m6 :match/away :athletic]
           [:m6 :match/home-goals 2]
           [:m6 :match/away-goals 0]
           [:m6 :match/date "2025-04-26"]
           [:m6 :match/winner :united]])`

// Lesson 2 variant: Leo's :player/club uses per-fact valid-time for his mid-season transfer.
// Omar's registration is valid only from 2025-04-19 (after his first match on 2025-04-12).
// Match m1 was initially recorded as 2-1 then corrected to 3-1 via retract + re-assert.
//
// Transaction log:
//   tx 1 — clubs
//   tx 2 — players (Leo: United stint with valid-to; Omar: delayed registration with valid-from)
//   tx 3 — Leo joins City (transact {:valid-from "2025-07-01"})
//   tx 4 — all matches (m1 home-goals initially recorded as 2)
//   tx 5 — retract m1 home-goals 2
//   tx 6 — re-assert m1 home-goals 3 (correct score)
const SETUP_L2 = `; Clubs
(transact [[:united :club/name "FC United"]
           [:city :club/name "City FC"]
           [:rovers :club/name "Rovers FC"]
           [:athletic :club/name "Athletic FC"]
           [:wanderers :club/name "Wanderers FC"]])

; Players — Leo's United stint has a valid-to; Omar's registration starts after his first match
(transact [[:marco :player/name "Marco"]
           [:marco :player/club :united]
           [:marco :player/goals 3]
           [:julia :player/name "Julia"]
           [:julia :player/club :united]
           [:julia :player/goals 1]
           [:leo :player/name "Leo"]
           [:leo :player/goals 2]
           ; Leo was at United until end of June 2025 (valid-time bounded)
           [:leo :player/club :united {:valid-from "2023-01-01" :valid-to "2025-06-30"}]
           [:sofia :player/name "Sofia"]
           [:sofia :player/club :rovers]
           [:sofia :player/goals 2]
           [:kai :player/name "Kai"]
           [:kai :player/club :athletic]
           [:kai :player/goals 1]
           [:omar :player/name "Omar"]
           [:omar :player/goals 1]
           ; Omar's registration only takes effect 2025-04-19 — after his first match (2025-04-12)
           [:omar :player/club :wanderers {:valid-from "2025-04-19"}]
           [:nina :player/name "Nina"]
           [:nina :player/club :wanderers]])

; Leo joins City from 2025-07-01 (open-ended, no valid-to)
(transact {:valid-from "2025-07-01"}
  [[:leo :player/club :city]])

; Matches — m1 initially recorded with wrong score (2-1 instead of 3-1)
(transact [[:m1 :match/home :united]
           [:m1 :match/away :city]
           [:m1 :match/home-goals 2]
           [:m1 :match/away-goals 1]
           [:m1 :match/date "2025-03-15"]
           [:m1 :match/winner :united]
           [:m2 :match/home :rovers]
           [:m2 :match/away :united]
           [:m2 :match/home-goals 0]
           [:m2 :match/away-goals 2]
           [:m2 :match/date "2025-03-22"]
           [:m2 :match/winner :united]
           [:m3 :match/home :city]
           [:m3 :match/away :athletic]
           [:m3 :match/home-goals 2]
           [:m3 :match/away-goals 0]
           [:m3 :match/date "2025-04-05"]
           [:m3 :match/winner :city]
           [:m4 :match/home :wanderers]
           [:m4 :match/away :rovers]
           [:m4 :match/home-goals 1]
           [:m4 :match/away-goals 1]
           [:m4 :match/date "2025-04-12"]
           [:m5 :match/home :athletic]
           [:m5 :match/away :wanderers]
           [:m5 :match/home-goals 1]
           [:m5 :match/away-goals 2]
           [:m5 :match/date "2025-04-19"]
           [:m5 :match/winner :wanderers]
           [:m6 :match/home :united]
           [:m6 :match/away :athletic]
           [:m6 :match/home-goals 2]
           [:m6 :match/away-goals 0]
           [:m6 :match/date "2025-04-26"]
           [:m6 :match/winner :united]])

; Score correction: a disallowed goal in m1 was reinstated on review — 2-1 becomes 3-1
(retract [[:m1 :match/home-goals 2]])
(transact [[:m1 :match/home-goals 3]])`

const lesson1: Lesson = {
  id: 'sports-league-1',
  title: 'Rosters, results, and expression filters',
  description: 'Query player rosters, match results, and filter with expression clauses.',
  steps: [
    {
      id: 'sl1-s1',
      instruction: `## Step 1: List all players with their club

The dataset has five clubs, seven players, and six matches. Run the setup and query to see every player alongside their club name.

The query joins \`player → :player/club → :club/name\`. Nina has no \`:player/goals\` fact (she is yet to score) but she does have a club, so she appears here.`,
      starterCode: `${SETUP}

(query [:find ?name ?club-name
        :where [?player :player/name ?name]
               [?player :player/club ?club]
               [?club :club/name ?club-name]])`,
      expectedResult: {
        columns: ['?name', '?club-name'],
        rows: [
          ['Marco', 'FC United'],
          ['Julia', 'FC United'],
          ['Leo', 'City FC'],
          ['Sofia', 'Rovers FC'],
          ['Kai', 'Athletic FC'],
          ['Omar', 'Wanderers FC'],
          ['Nina', 'Wanderers FC'],
        ],
      },
      hints: [
        'Chain two clauses: `[?player :player/club ?club]` binds the club entity, then `[?club :club/name ?club-name]` resolves the name string.',
        'Nina has a `:player/club` fact so she appears in the roster — the absence of `:player/goals` is irrelevant here.',
      ],
      successMessage: 'All seven players listed with their clubs.',
    },
    {
      id: 'sl1-s2',
      instruction: `## Step 2: Find FC United's home matches

Use the keyword literal \`:united\` in the \`:match/home\` position to restrict results to FC United's home games. All other variables remain free to bind across the full match set.`,
      starterCode: `${SETUP}

(query [:find ?date ?home-goals ?away-goals
        :where [?match :match/home :united]
               [?match :match/date ?date]
               [?match :match/home-goals ?home-goals]
               [?match :match/away-goals ?away-goals]])`,
      expectedResult: {
        columns: ['?date', '?home-goals', '?away-goals'],
        rows: [
          ['2025-03-15', '3', '1'],
          ['2025-04-26', '2', '0'],
        ],
      },
      hints: [
        'Using `:united` as a literal in `[?match :match/home :united]` binds only matches where FC United played at home.',
        'FC United had two home games this season: match 1 (3-1 vs City FC) and match 6 (2-0 vs Athletic FC).',
      ],
      successMessage: "FC United's two home wins retrieved.",
    },
    {
      id: 'sl1-s3',
      instruction: `## Step 3: Filter players by goals scored

Add an expression clause \`[(>= ?goals 2)]\` after binding \`?goals\` to keep only players who have scored at least two goals this season.`,
      starterCode: `${SETUP}

(query [:find ?name ?goals
        :where [?player :player/name ?name]
               [?player :player/goals ?goals]
               [(>= ?goals 2)]])`,
      expectedResult: {
        columns: ['?name', '?goals'],
        rows: [
          ['Marco', '3'],
          ['Leo', '2'],
          ['Sofia', '2'],
        ],
      },
      hints: [
        'Expression clauses `[(>= ?goals 2)]` are evaluated after all triple patterns match — `?goals` must already be bound by `[?player :player/goals ?goals]`.',
        'Nina has no `:player/goals` fact so the clause `[?player :player/goals ?goals]` produces no match for her — she is naturally excluded before the expression even fires.',
      ],
      successMessage: 'Marco (3), Leo (2), and Sofia (2) — the three players with two or more goals.',
    },
    {
      id: 'sl1-s4',
      instruction: `## Step 4: Top scorer for a specific club (open-ended)

Write a query that finds the players and goal counts for a specific club. Try filtering by \`:player/club :united\` first, then adapt for another club.

You can also explore away results by swapping \`:match/home\` for \`:match/away\`.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Find FC United players and their goals
(query [:find ?name ?goals
        :where [?player :player/club :united]
               [?player :player/name ?name]
               [?player :player/goals ?goals]])`,
      hints: [
        'Filter players by `[?player :player/club :united]` to scope the query to a single club. Swap `:united` for `:city`, `:rovers`, etc. to check other clubs.',
        'To find away results, use `[?match :match/away :united]` and retrieve `:match/home-goals` and `:match/away-goals` separately.',
      ],
      successMessage: 'You filtered players by club and explored match results for a specific team.',
    },
  ],
}

const lesson2: Lesson = {
  id: 'sports-league-2',
  title: 'Bi-temporal history',
  description:
    'Use valid time to query squad state on match day, and transaction time to audit a retroactive score correction.',
  steps: [
    {
      id: 'sl2-s1',
      instruction: `## Step 1: Squad state on match day with \`:valid-at\`

\`:valid-at "date"\` answers "what was true in the world on this date?" It filters triples to only those whose valid-time window covers the given date.

Leo transferred from FC United to City FC at the end of June 2025. His United stint is recorded with a \`valid-to\` of 2025-06-30. The two queries show his club on match day (still at United) versus after his transfer cleared.`,
      starterCode: `${SETUP_L2}

; Leo's club on match day 2025-03-15 — he is still at United
(query [:find ?club
        :valid-at "2025-03-15"
        :where [:leo :player/club ?club]])

; Leo's club in September 2025 — after his transfer to City
(query [:find ?club
        :valid-at "2025-09-01"
        :where [:leo :player/club ?club]])`,
      expectedResult: {
        columns: ['?club'],
        rows: [[':city']],
      },
      hints: [
        'The per-fact valid-time `[:leo :player/club :united {:valid-from "2023-01-01" :valid-to "2025-06-30"}]` is only visible when `:valid-at` falls inside that window.',
        'The open-ended fact `(transact {:valid-from "2025-07-01"} [[:leo :player/club :city]])` has no valid-to, so it covers all dates from 2025-07-01 onwards.',
      ],
      successMessage: "Post-transfer snapshot: Leo's club is :city.",
    },
    {
      id: 'sl2-s2',
      instruction: `## Step 2: Audit a score correction with \`:as-of\`

\`:as-of N\` answers "what did the database believe after transaction N?" It replays the log up to that transaction count, ignoring later corrections.

Match 1 (United vs City) was initially recorded as 2-1 in transaction 4. Transactions 5-6 later corrected this: the 2 was retracted and replaced with 3 (a disallowed goal was reinstated on review). The queries show the database's belief before and after the correction.`,
      starterCode: `${SETUP_L2}

; What the DB believed at tx 4 (before the correction)
(query [:find ?home-goals
        :as-of 4
        :where [:m1 :match/home-goals ?home-goals]])

; Current belief (after the correction — the correct 3-1 score)
(query [:find ?home-goals
        :where [:m1 :match/home-goals ?home-goals]])`,
      expectedResult: {
        columns: ['?home-goals'],
        rows: [['3']],
      },
      hints: [
        '`:as-of 4` replays only the first 4 transactions, so the retract (tx 5) and re-assert (tx 6) have not been applied yet — the original 2 is still present.',
        'The current (no `:as-of`) view sees all 6 transactions: the 2 was retracted and replaced with 3, so only 3 is returned.',
      ],
      successMessage: 'Corrected score of 3 confirmed; before correction the DB believed 2.',
    },
    {
      id: 'sl2-s3',
      instruction: `## Step 3: Combine both axes for a complete audit

Combining \`:as-of N\` with \`:valid-at "date"\` answers "what did the database believe at transaction N about the world on date D?" — the gold standard for temporal audits.

At transaction 2 only Leo's United stint (valid until 2025-06-30) has been recorded. The City transfer (tx 3) has not been applied yet, so querying Leo's club at 2025-09-01 at that early snapshot returns nothing. The current view includes all transactions and correctly shows City.`,
      starterCode: `${SETUP_L2}

; At tx 2, Leo's City contract (tx 3) had not been applied.
; His United stint ends 2025-06-30 — 2025-09-01 falls outside it → empty.
(query [:find ?club
        :as-of 2
        :valid-at "2025-09-01"
        :where [:leo :player/club ?club]])

; Current view: tx 3 has been applied — Leo is at City from 2025-07-01 onwards.
(query [:find ?club
        :valid-at "2025-09-01"
        :where [:leo :player/club ?club]])`,
      expectedResult: {
        columns: ['?club'],
        rows: [[':city']],
      },
      hints: [
        'At `:as-of 2`, the database only knows transactions 1 and 2. Transaction 3 (the City open-ended fact) has not been applied, so no club fact covers 2025-09-01.',
        'The current view includes all 6 transactions. Transaction 3 asserts `:leo :player/club :city` from 2025-07-01 with no valid-to, so it covers 2025-09-01.',
      ],
      successMessage: 'Bi-temporal audit complete: empty at the tx-2 snapshot, :city in the current view.',
    },
    {
      id: 'sl2-s4',
      instruction: `## Step 4: Explore Omar's eligibility (open-ended)

Omar played in match 4 (Wanderers vs Rovers, 2025-04-12) before his club registration took effect. His \`:player/club :wanderers\` fact is only valid from 2025-04-19 — one week after the match.

Using \`:valid-at\`, check whether Omar was registered on match day. Then verify that he appears as a registered Wanderers player on and after 2025-04-19.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

; Was Omar registered on match day?
(query [:find ?club
        :valid-at "2025-04-12"
        :where [:omar :player/club ?club]])

; Is Omar registered on his actual registration date?
(query [:find ?club
        :valid-at "2025-04-19"
        :where [:omar :player/club ?club]])`,
      hints: [
        'Omar\'s registration `[:omar :player/club :wanderers {:valid-from "2025-04-19"}]` starts after match 4. At `:valid-at "2025-04-12"` no club fact covers that date — the first query returns empty.',
        'At `:valid-at "2025-04-19"` the open-ended fact is now in range, so Omar appears as a Wanderers player.',
      ],
      successMessage: "You audited Omar's eligibility: unregistered on match day, registered from 2025-04-19.",
    },
  ],
}

const lesson3: Lesson = {
  id: 'sports-league-3',
  title: 'Recursive transfer chains',
  description: 'Trace which clubs are connected through the mid-season player transfer network.',
  steps: [
    {
      id: 'sl3-s1',
      instruction: `## Step 1: Define the \`transfer-link\` rule

A **rule** derives new facts from existing ones. The rule below says: "club A is transfer-linked to club B if some player carries a \`:player/prev-club\` of A and a current \`:player/club\` of B."

Leo transferred from United to City (\`:player/prev-club :united\`, \`:player/club :city\`). Sofia transferred from City to Rovers (\`:player/prev-club :city\`, \`:player/club :rovers\`). These two facts wire together a directed transfer network.

Running only rules produces no result rows — rules register derived predicates but do not return data on their own.`,
      starterCode: `${SETUP}

(rule [(transfer-link ?from ?to) [?p :player/prev-club ?from] [?p :player/club ?to]])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'The rule head `(transfer-link ?from ?to)` names the derived predicate. The body `[?p :player/prev-club ?from] [?p :player/club ?to]` specifies what must hold for it to fire.',
        'Rules alone return no rows — they register predicates for use in `(query ...)` calls. Add a query in the next step to see results.',
      ],
      successMessage: 'transfer-link rule registered — the directed transfer predicate is now available for querying.',
    },
    {
      id: 'sl3-s2',
      instruction: `## Step 2: Which clubs did players transfer to from United?

Query the derived \`transfer-link\` predicate with \`:united\` as the source to find all clubs that received a player who previously played for FC United.

Leo is the only player with \`:player/prev-club :united\`, and he now plays for City FC — so the query returns one club.`,
      starterCode: `${SETUP}

(rule [(transfer-link ?from ?to) [?p :player/prev-club ?from] [?p :player/club ?to]])

(query [:find ?to-name
        :where (transfer-link :united ?to)
               [?to :club/name ?to-name]])`,
      expectedResult: {
        columns: ['?to-name'],
        rows: [['City FC']],
      },
      hints: [
        'The literal `:united` in `(transfer-link :united ?to)` binds the source position — only clubs that received a player from United will be returned.',
        'Leo is the only player with `:player/prev-club :united`, so only City FC appears.',
      ],
      successMessage: 'City FC returned — the one club that received a United transfer this season.',
    },
    {
      id: 'sl3-s3',
      instruction: `## Step 3: Transitive clubs reachable from United

Add a second recursive rule to make the chain transitive: clubs reachable via any number of hops are all returned.

- **Base case** — \`transfer-chain ?a ?b\` holds if there is a direct \`transfer-link\` from A to B.
- **Recursive case** — \`transfer-chain ?a ?b\` holds if there is a direct link from A to some intermediate club M, and M can reach B via \`transfer-chain\`.

United → City (Leo), City → Rovers (Sofia): both hops appear in the result.`,
      starterCode: `${SETUP}

(rule [(transfer-link ?from ?to) [?p :player/prev-club ?from] [?p :player/club ?to]])
(rule [(transfer-chain ?a ?b) (transfer-link ?a ?b)])
(rule [(transfer-chain ?a ?b) (transfer-link ?a ?mid) (transfer-chain ?mid ?b)])

(query [:find ?name
        :where [?united :club/name "FC United"]
               (transfer-chain ?united ?club)
               [?club :club/name ?name]])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['City FC'], ['Rovers FC']],
      },
      hints: [
        'The base case `(transfer-chain ?a ?b) (transfer-link ?a ?b)` covers the direct United → City hop (via Leo).',
        'The recursive case fires a second time: United → City (via Leo) then City → Rovers (via Sofia) — giving Rovers as a 2-hop result.',
      ],
      successMessage: 'City FC (1 hop) and Rovers FC (2 hops) returned via the recursive transfer chain.',
    },
    {
      id: 'sl3-s4',
      instruction: `## Step 4: Explore reverse chains or club connectivity (open-ended)

Try querying in the reverse direction — which clubs feed into a given club? Or check whether any two clubs are connected at all by swapping the variable positions.

You can also add a new player with a \`:player/prev-club\` fact to extend the transfer network and re-run the query to see the chain grow.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

(rule [(transfer-link ?from ?to) [?p :player/prev-club ?from] [?p :player/club ?to]])
(rule [(transfer-chain ?a ?b) (transfer-link ?a ?b)])
(rule [(transfer-chain ?a ?b) (transfer-link ?a ?mid) (transfer-chain ?mid ?b)])

; Which clubs feed into Rovers via the transfer chain?
(query [:find ?name
        :where (transfer-chain ?club :rovers)
               [?club :club/name ?name]])`,
      hints: [
        'Reversing the arguments — `(transfer-chain ?club :rovers)` — finds all source clubs whose transfer chain reaches Rovers.',
        'To extend the network, add a new player with `[:new-player :player/club :athletic] [:new-player :player/prev-club :rovers]` before the rules and re-run the query.',
      ],
      successMessage: 'You explored the transfer network in reverse and experimented with extending the chain.',
    },
  ],
}

const lesson4: Lesson = {
  id: 'sports-league-4',
  title: 'Negation',
  description: 'Use not and not-join to find players and clubs defined by the absence of a fact.',
  steps: [
    {
      id: 'sl4-s1',
      instruction: `## Step 1: Players who never scored (\`not\`)

Find players with no \`:player/goals\` fact. Nina has never scored — she is the only player without a goals entry in the dataset.

\`not\` negates a pattern where all referenced variables are already bound by the outer query. Here \`?player\` is bound by the name clause, and the wildcard \`_\` introduces no new variable that needs sharing.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?player :player/name ?name]
               (not [?player :player/goals _])])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Nina']],
      },
      hints: [
        '`not` succeeds for each `?player` binding where no `[?player :player/goals _]` triple exists at all.',
        'All other players have a `:player/goals` fact, so only Nina passes the not check.',
      ],
      successMessage: 'Nina returned — the sole player with no goals fact.',
    },
    {
      id: 'sl4-s2',
      instruction: `## Step 2: Clubs with no match wins (\`not-join\`)

Find clubs that never appear as \`:match/winner\`. Rovers FC and Athletic FC did not win any of the six matches this season — Rovers drew their one eligible match and Athletic lost all three games they played.

\`not-join [?club]\` shares the club entity variable between the outer query and the negated pattern. For each club, it checks whether any triple \`[_ :match/winner ?club]\` exists — if none does, that club is included in the results.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?club :club/name ?name]
               (not-join [?club]
                 [_ :match/winner ?club])])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Rovers FC'], ['Athletic FC']],
      },
      hints: [
        '`not-join [?club]` shares `?club` with the outer query. For each club entity, it checks whether any `:match/winner` triple points at it. If none, the club passes.',
        'FC United, City FC, and Wanderers FC all have at least one `:match/winner` fact pointing at them. Rovers and Athletic do not.',
      ],
      successMessage: 'Rovers FC and Athletic FC returned — the two clubs with no wins this season.',
    },
    {
      id: 'sl4-s3',
      instruction: `## Step 3: Players who never transferred (\`not\`)

Find players with no \`:player/prev-club\` fact. Only Leo and Sofia have transfer history in this dataset — the remaining five players have been at their current club all season.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?player :player/name ?name]
               (not [?player :player/prev-club _])])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Marco'], ['Julia'], ['Kai'], ['Omar'], ['Nina']],
      },
      hints: [
        'Only Leo (`prev-club: :united`) and Sofia (`prev-club: :city`) have `:player/prev-club` facts. All other players pass the `not` check.',
        '`not` is sufficient here — the negated pattern `[?player :player/prev-club _]` only uses `?player`, which is already bound.',
      ],
      successMessage: 'Five players returned — those with no prior-club fact in the dataset.',
    },
    {
      id: 'sl4-s4',
      instruction: `## Step 4: Clubs whose players never scored (open-ended)

Write a query that finds clubs where no registered player has a \`:player/goals\` fact — i.e., clubs with an entirely scoreless squad.

You will need a \`not-join\` that checks whether any player belonging to the club has a goals fact.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Find clubs with no scoring players
; Hint: filter clubs, then not-join on [:player :player/club ?club] and [:player :player/goals _]
(query [:find ?name
        :where [?club :club/name ?name]
               (not-join [?club]
                 [?player :player/club ?club]
                 [?player :player/goals _])])`,
      hints: [
        'The inner `not-join` body can contain multiple patterns — they must all hold for the join to succeed (and therefore for the outer result to be excluded).',
        'A club passes only if no single player satisfies both `[?player :player/club ?club]` and `[?player :player/goals _]` simultaneously.',
      ],
      successMessage: 'You combined multi-clause not-join to find clubs with no scoring players.',
    },
  ],
}

const lesson5: Lesson = {
  id: 'sports-league-5',
  title: 'Aggregates',
  description: 'Compute squad sizes, goal tallies, and top-scorer rankings grouped by club.',
  steps: [
    {
      id: 'sl5-s1',
      instruction: `## Step 1: Squad size per club

\`(count ?player)\` in the \`:find\` clause aggregates the number of distinct player entities matched for each group of club names.

FC United has Marco and Julia (2 players). Wanderers FC has Omar and Nina (2 players). The other three clubs each have one player.`,
      starterCode: `${SETUP}

(query [:find ?club-name (count ?player)
        :where [?club :club/name ?club-name]
               [?player :player/club ?club]])`,
      expectedResult: {
        columns: ['?club-name', '(count ?player)'],
        rows: [
          ['FC United', '2'],
          ['City FC', '1'],
          ['Rovers FC', '1'],
          ['Athletic FC', '1'],
          ['Wanderers FC', '2'],
        ],
      },
      hints: [
        'The inner join `[?player :player/club ?club]` groups each player under their club. `(count ?player)` then counts how many distinct players land in each group.',
        'Nina has a `:player/club` fact so she is counted in the Wanderers squad — the absence of `:player/goals` is irrelevant to squad membership.',
      ],
      successMessage: 'FC United: 2, City FC: 1, Rovers FC: 1, Athletic FC: 1, Wanderers FC: 2.',
    },
    {
      id: 'sl5-s2',
      instruction: `## Step 2: Total goals per club

\`(sum ?goals)\` sums the goals values for each club group. Bind \`?goals\` with a triple clause before using it in the aggregate.

FC United leads with 4 (Marco 3 + Julia 1). City FC and Rovers FC each have 2. Athletic FC and Wanderers FC each have 1. Nina has no \`:player/goals\` fact so the join produces no row for her — she is naturally excluded from the sum.`,
      starterCode: `${SETUP}

(query [:find ?club-name (sum ?goals)
        :where [?club :club/name ?club-name]
               [?player :player/club ?club]
               [?player :player/goals ?goals]])`,
      expectedResult: {
        columns: ['?club-name', '(sum ?goals)'],
        rows: [
          ['FC United', '4'],
          ['City FC', '2'],
          ['Rovers FC', '2'],
          ['Athletic FC', '1'],
          ['Wanderers FC', '1'],
        ],
      },
      hints: [
        'Bind `?goals` with `[?player :player/goals ?goals]` before using `(sum ?goals)` — aggregates operate on variables already matched by the `:where` clauses.',
        'Nina has no `:player/goals` fact, so the `[?player :player/goals ?goals]` clause fails for her and she contributes nothing to the Wanderers sum.',
      ],
      successMessage: 'FC United leads with 4 goals. City FC and Rovers FC tied at 2. Athletic FC and Wanderers FC at 1 each.',
    },
    {
      id: 'sl5-s3',
      instruction: `## Step 3: Top scorer per club

\`(max ?goals)\` returns the maximum goals value within each club group — identifying the leading scorer at each club.

Marco leads FC United with 3. Leo and Sofia top City FC and Rovers FC respectively with 2 each. Kai and Omar each lead their clubs with 1.`,
      starterCode: `${SETUP}

(query [:find ?club-name (max ?goals)
        :where [?club :club/name ?club-name]
               [?player :player/club ?club]
               [?player :player/goals ?goals]])`,
      expectedResult: {
        columns: ['?club-name', '(max ?goals)'],
        rows: [
          ['FC United', '3'],
          ['City FC', '2'],
          ['Rovers FC', '2'],
          ['Athletic FC', '1'],
          ['Wanderers FC', '1'],
        ],
      },
      hints: [
        '`(max ?goals)` picks the largest goals value across all players in each club group, using the same join as the previous steps.',
        'FC United max is Marco\'s 3. City FC and Rovers FC max is 2 (Leo and Sofia respectively). Single-player clubs return their one player\'s tally as the max.',
      ],
      successMessage: 'Top scorers per club: FC United 3 (Marco), City FC & Rovers FC 2, Athletic FC & Wanderers FC 1.',
    },
    {
      id: 'sl5-s4',
      instruction: `## Step 4: Win count per club (open-ended)

Count how many matches each club has won by grouping on \`:match/winner\`. Clubs with zero wins will not appear — the inner join naturally excludes them.

Compare this with the negation lesson (lesson 4, step 2) where you found those same zero-win clubs using \`not-join\`.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Count wins per club — only clubs with at least one win appear
(query [:find ?club-name (count ?match)
        :where [?club :club/name ?club-name]
               [?match :match/winner ?club]])`,
      hints: [
        'The join `[?match :match/winner ?club]` groups matches by their winner. `(count ?match)` counts how many matches each club won.',
        'Rovers FC and Athletic FC have no `:match/winner` facts, so the join produces no rows for them and they are excluded — the aggregate counterpart to the `not-join` from lesson 4.',
      ],
      successMessage: 'You counted wins per club and observed how aggregates and negation complement each other.',
    },
  ],
}

export const tutorialSportsLeague: Tutorial = {
  id: 'sports-league',
  title: 'Sports League',
  description: 'Track teams, player transfers, and match results across a full season.',
  goals: 'bi-temporal contract tracking, recursive transfer-chain rules, and window-style aggregates',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1, lesson2, lesson3, lesson4, lesson5],
}
