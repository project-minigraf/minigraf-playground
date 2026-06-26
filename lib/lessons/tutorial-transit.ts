import type { Lesson, Tutorial } from '@/lib/types'

// 8 stations, 3 lines, 10 stops
// Central and East Park are multi-line hubs (transfer points for recursion lesson)
// Oak Grove has no stop yet — not served by any current line (drives negation lesson)
// Bay Harbor (:bs4) and Hill Top (:gs3) are weekday-only — no :stop/weekend fact (drives negation step 1)
const SETUP = `; Stations
(transact [[:central :station/name "Central Station"]
           [:north :station/name "North Gate"]
           [:east :station/name "East Park"]
           [:west :station/name "West End"]
           [:south :station/name "South Cross"]
           [:bay :station/name "Bay Harbor"]
           [:hill :station/name "Hill Top"]
           [:grove :station/name "Oak Grove"]])

; Lines
(transact [[:red :line/name "Red Line"]
           [:blue :line/name "Blue Line"]
           [:green :line/name "Green Line"]])

; Stops — Oak Grove has no stop (not yet served by any line)
; Red Line:   Central(1) → North Gate(2)  → East Park(3)
; Blue Line:  Central(1) → West End(2)    → South Cross(3) → Bay Harbor(4)
; Green Line: Central(1) → East Park(2)   → Hill Top(3)
(transact [[:rs1 :stop/line :red]   [:rs1 :stop/station :central] [:rs1 :stop/order 1]
           [:rs2 :stop/line :red]   [:rs2 :stop/station :north]   [:rs2 :stop/order 2]
           [:rs3 :stop/line :red]   [:rs3 :stop/station :east]    [:rs3 :stop/order 3]
           [:bs1 :stop/line :blue]  [:bs1 :stop/station :central] [:bs1 :stop/order 1]
           [:bs2 :stop/line :blue]  [:bs2 :stop/station :west]    [:bs2 :stop/order 2]
           [:bs3 :stop/line :blue]  [:bs3 :stop/station :south]   [:bs3 :stop/order 3]
           [:bs4 :stop/line :blue]  [:bs4 :stop/station :bay]     [:bs4 :stop/order 4]
           [:gs1 :stop/line :green] [:gs1 :stop/station :central] [:gs1 :stop/order 1]
           [:gs2 :stop/line :green] [:gs2 :stop/station :east]    [:gs2 :stop/order 2]
           [:gs3 :stop/line :green] [:gs3 :stop/station :hill]    [:gs3 :stop/order 3]])

; Weekend service flags — stops without a :stop/weekend fact are weekday-only
; Bay Harbor (:bs4) and Hill Top (:gs3) have no weekend service
(transact [[:rs1 :stop/weekend true]
           [:rs2 :stop/weekend true]
           [:rs3 :stop/weekend true]
           [:bs1 :stop/weekend true]
           [:bs2 :stop/weekend true]
           [:bs3 :stop/weekend true]
           [:gs1 :stop/weekend true]
           [:gs2 :stop/weekend true]])`

// Lesson 2 bi-temporal variant.
//
// All base stops carry an explicit {valid-from "2025-01-01"} bound so they are
// visible to :valid-at queries (facts with no valid-time bounds are invisible
// to :valid-at filters in Minigraf).
//
// Transaction log:
//   tx 1 — stations (unbounded eternal reference)
//   tx 2 — lines (unbounded eternal reference)
//   tx 3 — all base stops with valid-from "2025-01-01" (service start)
//           Bay Harbor initially open-ended (no valid-to)
//   tx 4 — future route extension: Oak Grove added to Red Line from 2025-09-01
//   tx 5 — retract Bay Harbor original stop (preparation for retroactive suspension)
//   tx 6 — re-assert Bay Harbor with {valid-from "2025-01-01" :valid-to "2025-03-01"}
const SETUP_L2 = `; Stations (unbounded — eternal reference, visible in default view only)
(transact [[:central :station/name "Central Station"]
           [:north :station/name "North Gate"]
           [:east :station/name "East Park"]
           [:west :station/name "West End"]
           [:south :station/name "South Cross"]
           [:bay :station/name "Bay Harbor"]
           [:hill :station/name "Hill Top"]
           [:grove :station/name "Oak Grove"]])

; Lines (unbounded — eternal reference)
(transact [[:red :line/name "Red Line"]
           [:blue :line/name "Blue Line"]
           [:green :line/name "Green Line"]])

; Base stops — all carry valid-from "2025-01-01" so they are visible to :valid-at queries
; Bay Harbor is initially open-ended (service started but not yet known to be suspended)
(transact {:valid-from "2025-01-01"}
  [[:rs1 :stop/line :red]   [:rs1 :stop/station :central] [:rs1 :stop/order 1]
   [:rs2 :stop/line :red]   [:rs2 :stop/station :north]   [:rs2 :stop/order 2]
   [:rs3 :stop/line :red]   [:rs3 :stop/station :east]    [:rs3 :stop/order 3]
   [:bs1 :stop/line :blue]  [:bs1 :stop/station :central] [:bs1 :stop/order 1]
   [:bs2 :stop/line :blue]  [:bs2 :stop/station :west]    [:bs2 :stop/order 2]
   [:bs3 :stop/line :blue]  [:bs3 :stop/station :south]   [:bs3 :stop/order 3]
   [:bs4 :stop/line :blue]  [:bs4 :stop/station :bay]     [:bs4 :stop/order 4]
   [:gs1 :stop/line :green] [:gs1 :stop/station :central] [:gs1 :stop/order 1]
   [:gs2 :stop/line :green] [:gs2 :stop/station :east]    [:gs2 :stop/order 2]
   [:gs3 :stop/line :green] [:gs3 :stop/station :hill]    [:gs3 :stop/order 3]])

; Route extension announced: Oak Grove added to Red Line from 2025-09-01
(transact {:valid-from "2025-09-01"}
  [[:rs4 :stop/line :red]
   [:rs4 :stop/station :grove]
   [:rs4 :stop/order 4]])

; Service suspension: an incident investigation concluded Bay Harbor service
; should have ended 2025-03-01 — applied retroactively via retract + re-assert
(retract [[:bs4 :stop/line :blue]
          [:bs4 :stop/station :bay]
          [:bs4 :stop/order 4]])
(transact [[:bs4 :stop/line :blue {:valid-from "2025-01-01" :valid-to "2025-03-01"}]
           [:bs4 :stop/station :bay {:valid-from "2025-01-01" :valid-to "2025-03-01"}]
           [:bs4 :stop/order 4 {:valid-from "2025-01-01" :valid-to "2025-03-01"}]])`

const lesson1: Lesson = {
  id: 'transit-1',
  title: 'Stations, lines, and stops',
  description: 'Query the network structure: stations, which lines they appear on, and their stop order.',
  steps: [
    {
      id: 't1-s1',
      instruction: `## Step 1: List all stations

The network has 8 stations spread across three lines. Run the setup and query to retrieve every station name.

Oak Grove is listed as a station but currently has no stop on any line — you will return to this in the negation lesson.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?s :station/name ?name]])`,
      expectedResult: {
        columns: ['?name'],
        rows: [
          ['Central Station'],
          ['North Gate'],
          ['East Park'],
          ['West End'],
          ['South Cross'],
          ['Bay Harbor'],
          ['Hill Top'],
          ['Oak Grove'],
        ],
      },
      hints: [
        'The pattern `[?s :station/name ?name]` matches every entity that has a `:station/name` attribute and binds its value to `?name`.',
        'All 8 stations appear including Oak Grove, which is registered as a station even though no line serves it yet.',
      ],
      successMessage: 'All 8 stations listed.',
    },
    {
      id: 't1-s2',
      instruction: `## Step 2: Which lines serve Central Station?

Central Station is the main interchange — it appears on all three lines. Join the stop entity through \`:stop/station :central\` to the line entity, then resolve the line name.`,
      starterCode: `${SETUP}

(query [:find ?line-name
        :where [?stop :stop/station :central]
               [?stop :stop/line ?line]
               [?line :line/name ?line-name]])`,
      expectedResult: {
        columns: ['?line-name'],
        rows: [['Red Line'], ['Blue Line'], ['Green Line']],
      },
      hints: [
        'Using `:central` as a literal in `[?stop :stop/station :central]` restricts the query to stops at Central Station.',
        'Each stop entity carries both `:stop/station` and `:stop/line`, so you can chain to the line name in one extra clause.',
      ],
      successMessage: 'Central Station is served by all three lines.',
    },
    {
      id: 't1-s3',
      instruction: `## Step 3: Red Line stops in order

Retrieve every station on the Red Line together with its stop position. The \`:stop/order\` attribute records where each station falls along the route.

The Red Line runs: Central Station (1) → North Gate (2) → East Park (3).`,
      starterCode: `${SETUP}

(query [:find ?station-name ?order
        :where [?stop :stop/line :red]
               [?stop :stop/station ?station]
               [?stop :stop/order ?order]
               [?station :station/name ?station-name]])`,
      expectedResult: {
        columns: ['?station-name', '?order'],
        rows: [
          ['Central Station', '1'],
          ['North Gate', '2'],
          ['East Park', '3'],
        ],
      },
      hints: [
        'Fix `:red` in `[?stop :stop/line :red]` to restrict to Red Line stops, then join through the stop entity to get both the station name and order.',
        'Datalog does not sort by default — results appear in the order facts were asserted. The `:stop/order` value tells you the actual stop sequence.',
      ],
      successMessage: 'Red Line: Central Station(1) → North Gate(2) → East Park(3).',
    },
    {
      id: 't1-s4',
      instruction: `## Step 4: Explore the Blue Line or find multi-line stations (open-ended)

Swap \`:red\` for \`:blue\` in the previous query to see the Blue Line's four stops. Alternatively, find which stations appear on more than one line by joining stops across line entities.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Blue Line stops in order
(query [:find ?station-name ?order
        :where [?stop :stop/line :blue]
               [?stop :stop/station ?station]
               [?stop :stop/order ?order]
               [?station :station/name ?station-name]])`,
      hints: [
        'Swap `:red` for `:blue` or `:green` to explore other lines. The Blue Line has 4 stops; the Green Line has 3.',
        'To find multi-line stations, query all (station, line) pairs and look for stations that appear more than once — that is a preview of the aggregates lesson.',
      ],
      successMessage: 'You explored line stop sequences and identified network structure.',
    },
  ],
}

const lesson2: Lesson = {
  id: 'transit-2',
  title: 'Bi-temporal timetable',
  description:
    'Use valid time and transaction time to query a future route extension and audit a retroactive service suspension.',
  steps: [
    {
      id: 't2-s1',
      instruction: `## Step 1: Future route extension with \`:valid-at\`

\`:valid-at "date"\` answers "what was true in the world on this date?" It filters triples to only those whose valid-time window covers the given date.

The Oak Grove extension was announced and recorded in advance with \`{:valid-from "2025-09-01"}\`. Querying Red Line stops before that date returns three station keywords; on and after it the extension becomes visible and a fourth keyword — \`:grove\` — appears.

**Note:** \`:valid-at\` queries only match facts that carry explicit valid-time bounds. That is why the base stops in this dataset use \`(transact {:valid-from "2025-01-01"} [...])\` — the valid-from bound makes them visible to \`:valid-at\` filters.`,
      starterCode: `${SETUP_L2}

; Red Line stop keywords before the extension takes effect
(query [:find ?station
        :valid-at "2025-08-01"
        :where [?stop :stop/line :red]
               [?stop :stop/station ?station]])

; Red Line stop keywords after the extension is active (Oak Grove from 2025-09-01)
(query [:find ?station
        :valid-at "2025-10-01"
        :where [?stop :stop/line :red]
               [?stop :stop/station ?station]])`,
      expectedResult: {
        columns: ['?station'],
        rows: [[':north'], [':grove'], [':central'], [':east']],
      },
      hints: [
        'At `:valid-at "2025-08-01"` the Oak Grove stop fact `{:valid-from "2025-09-01"}` has not yet become valid — its window starts one month later. Only three Red Line stations appear.',
        'At `:valid-at "2025-10-01"` the window is open and `:grove` appears as the fourth Red Line station keyword.',
      ],
      successMessage: 'Post-extension snapshot: :grove joins the Red Line from 2025-09-01.',
    },
    {
      id: 't2-s2',
      instruction: `## Step 2: Retroactive suspension with \`:as-of\`

\`:as-of N\` answers "what did the database believe after transaction N?" It replays only the first N transactions, ignoring later corrections.

Bay Harbor was originally recorded as an open-ended Blue Line stop (service started 2025-01-01). An incident investigation later concluded that service should have been suspended from 2025-03-01. Transactions 5–6 retract the original fact and re-assert it with \`{:valid-to "2025-03-01"}\`.

These queries use no \`:valid-at\` filter, so the engine uses today as the valid-time anchor. At transaction 3 (before the suspension), Bay Harbor had no end date — it appeared in today's view. After the correction, its valid-to expired on 2025-03-01, long before today.`,
      starterCode: `${SETUP_L2}

; At tx 3 — suspension not yet recorded: Bay Harbor is open-ended, visible today
(query [:find ?station-name
        :as-of 3
        :where [?stop :stop/line :blue]
               [?stop :stop/station ?station]
               [?station :station/name ?station-name]])

; Current view — Bay Harbor's valid-to is 2025-03-01, expired → excluded today
(query [:find ?station-name
        :where [?stop :stop/line :blue]
               [?stop :stop/station ?station]
               [?station :station/name ?station-name]])`,
      expectedResult: {
        columns: ['?station-name'],
        rows: [['Central Station'], ['South Cross'], ['West End']],
      },
      hints: [
        '`:as-of 3` replays only transactions 1–3. The retract (tx 5) and re-assert (tx 6) have not been applied, so Bay Harbor still has no valid-to — it appears in today\'s view.',
        'The current view (no `:as-of`) has applied all 6 transactions. Bay Harbor now carries `valid-to "2025-03-01"`, which is in the past. The engine uses today as the valid-at anchor, so Bay Harbor is excluded.',
      ],
      successMessage: 'Bay Harbor excluded from the current Blue Line view after the retroactive suspension.',
    },
    {
      id: 't2-s3',
      instruction: `## Step 3: Combine both axes for a complete audit

Combining \`:as-of N\` with \`:valid-at "date"\` answers "what did the database believe at transaction N about the world on date D?" — the gold standard for temporal audits.

At transaction 3, the suspension had not been recorded. Querying the Blue Line valid at 2025-04-01 at that snapshot still showed Bay Harbor — because the database did not yet know about the suspension. The current view (including the retroactive correction from tx 5–6) excludes Bay Harbor from the same date.

The queries return station keywords rather than names because \`:valid-at\` filters out facts with no valid-time bounds, which includes the station name facts.`,
      starterCode: `${SETUP_L2}

; At tx 3 with valid-at 2025-04-01: Bay Harbor had no valid-to → appeared valid on April 1
(query [:find ?station
        :as-of 3
        :valid-at "2025-04-01"
        :where [?stop :stop/line :blue]
               [?stop :stop/station ?station]])

; Current view with valid-at 2025-04-01: suspension applied — Bay Harbor suspended from 2025-03-01
(query [:find ?station
        :valid-at "2025-04-01"
        :where [?stop :stop/line :blue]
               [?stop :stop/station ?station]])`,
      expectedResult: {
        columns: ['?station'],
        rows: [[':south'], [':central'], [':west']],
      },
      hints: [
        'At `:as-of 3` `:valid-at "2025-04-01"`: Bay Harbor was open-ended in the tx-3 snapshot — `valid-from "2025-01-01"` covers April 1, so `:bay` appears.',
        'Current `:valid-at "2025-04-01"`: the retroactive correction set `valid-to "2025-03-01"`. Since 2025-03-01 < 2025-04-01, Bay Harbor is now outside the valid window — it is excluded.',
      ],
      successMessage:
        'Bi-temporal audit complete: recording the retroactive suspension changed our historical view of Bay Harbor on 2025-04-01.',
    },
    {
      id: 't2-s4',
      instruction: `## Step 4: Explore the extension timeline (open-ended)

Use \`:as-of\` and \`:valid-at\` to trace when Oak Grove first becomes visible on the Red Line:

- \`:as-of 3 :valid-at "2025-10-01"\` — extension not yet recorded → no \`:grove\`
- Current \`:valid-at "2025-10-01"\` — extension recorded → \`:grove\` appears

You can also explore Bay Harbor's visibility at different valid-at dates to see exactly when it becomes invisible.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

; Before the extension was recorded (tx 3 snapshot): no Oak Grove on Red Line
(query [:find ?station
        :as-of 3
        :valid-at "2025-10-01"
        :where [?stop :stop/line :red]
               [?stop :stop/station ?station]])

; Current view: extension recorded — Oak Grove active from 2025-09-01
(query [:find ?station
        :valid-at "2025-10-01"
        :where [?stop :stop/line :red]
               [?stop :stop/station ?station]])`,
      hints: [
        'At `:as-of 3` the extension (tx 4) has not been applied — no Oak Grove stop fact exists in that snapshot regardless of the valid-at date.',
        'The current view includes tx 4. At `:valid-at "2025-10-01"` the `valid-from "2025-09-01"` window is open, so `:grove` appears.',
      ],
      successMessage: 'You traced the route extension across both the transaction and valid-time axes.',
    },
  ],
}

const lesson3: Lesson = {
  id: 'transit-3',
  title: 'Recursive reachability',
  description: 'Define rules for station connectivity and trace which stations can be reached via transfers.',
  steps: [
    {
      id: 't3-s1',
      instruction: `## Step 1: Define the \`same-line\` rule

A **rule** derives new facts from existing ones. Two rules together make the \`same-line\` predicate **bidirectional**: the first covers pairs where station A comes earlier in stop order, the second covers pairs where A comes later. Together they capture every pair of distinct stations sharing a line.

Central Station and East Park are both on the Red Line and the Green Line — they are reachable from each other without a transfer. Stations on different lines can only be reached via a hub that appears on both.

Running only rules produces no result rows — rules register derived predicates but do not return data on their own.`,
      starterCode: `${SETUP}

(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(< ?o1 ?o2)]])
(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(> ?o1 ?o2)]])`,
      expectedResult: { columns: [], rows: [] },
      hints: [
        'Two rules with the same head act as a union: `same-line` holds if either rule body is satisfied. Together `[(< ?o1 ?o2)]` and `[(> ?o1 ?o2)]` cover all distinct station pairs on a shared line.',
        'Rules alone return no rows — they register predicates for use in `(query ...)` calls. Add a query in the next step to see results.',
      ],
      successMessage: 'same-line rules registered — the bidirectional connectivity predicate is now available.',
    },
    {
      id: 't3-s2',
      instruction: `## Step 2: Direct connections from North Gate

Query the \`same-line\` predicate with \`:north\` fixed as the source to find every station directly reachable without a transfer.

North Gate is on the Red Line only. The other Red Line stations are Central Station (order 1) and East Park (order 3) — those are its two direct neighbours.`,
      starterCode: `${SETUP}

(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(< ?o1 ?o2)]])
(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(> ?o1 ?o2)]])

(query [:find ?name
        :where (same-line :north ?station)
               [?station :station/name ?name]])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['East Park'], ['Central Station']],
      },
      hints: [
        'Fixing `:north` in `(same-line :north ?station)` restricts the source — only stations that share a line with North Gate are returned.',
        'North Gate is exclusively on the Red Line. `[(< ?o1 ?o2)]` matches Central Station→North Gate, so the reverse rule `[(> ?o1 ?o2)]` fires for (North Gate, Central Station).',
      ],
      successMessage: 'East Park and Central Station — the two direct neighbours of North Gate.',
    },
    {
      id: 't3-s3',
      instruction: `## Step 3: All stations reachable from North Gate via transfers

Add a recursive \`reachable\` rule to follow transfer connections across lines:

- **Base case** — \`reachable ?a ?b\` holds if there is a direct \`same-line\` link from A to B.
- **Recursive case** — \`reachable ?a ?b\` holds if A is directly linked to some intermediate M, and M can reach B.

Central Station and East Park are the hubs: Central connects to the Blue and Green Lines; East Park bridges the Red and Green Lines. Through these hubs, North Gate can reach every served station.

**Note:** Because \`same-line\` is bidirectional, the network is fully connected and every station is reachable from every other — including the origin station itself via the back-link through a hub.`,
      starterCode: `${SETUP}

(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(< ?o1 ?o2)]])
(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(> ?o1 ?o2)]])
(rule [(reachable ?a ?b) (same-line ?a ?b)])
(rule [(reachable ?a ?b) (same-line ?a ?mid) (reachable ?mid ?b)])

(query [:find ?name
        :where [?north :station/name "North Gate"]
               (reachable ?north ?station)
               [?station :station/name ?name]])`,
      expectedResult: {
        columns: ['?name'],
        rows: [
          ['South Cross'],
          ['West End'],
          ['Hill Top'],
          ['North Gate'],
          ['Central Station'],
          ['Bay Harbor'],
          ['East Park'],
        ],
      },
      hints: [
        'The base case covers same-line neighbours: Central Station and East Park for North Gate.',
        'The recursive case fires repeatedly from each hub until no new stations are discovered. Because the network is bidirectional, North Gate itself is reachable via North Gate → Central Station → North Gate.',
        'Oak Grove has no stop entity, so no `same-line` fact involves it — it cannot be reached by any path.',
      ],
      successMessage:
        'All 7 served stations reachable from North Gate — including North Gate itself via the bidirectional hub. Oak Grove remains isolated.',
    },
    {
      id: 't3-s4',
      instruction: `## Step 4: Which stations are NOT reachable from West End? (open-ended)

Try \`(reachable :west ?station)\` to see all stations reachable from West End. Since the served network is fully connected, all served stations should appear.

Then try to find stations that are NOT reachable by using \`not-join\`. Only Oak Grove — which has no stops — should be absent from the reachable set.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(< ?o1 ?o2)]])
(rule [(same-line ?a ?b)
       [?s1 :stop/line ?line] [?s1 :stop/station ?a] [?s1 :stop/order ?o1]
       [?s2 :stop/line ?line] [?s2 :stop/station ?b] [?s2 :stop/order ?o2]
       [(> ?o1 ?o2)]])
(rule [(reachable ?a ?b) (same-line ?a ?b)])
(rule [(reachable ?a ?b) (same-line ?a ?mid) (reachable ?mid ?b)])

; Stations reachable from West End
(query [:find ?name
        :where (reachable :west ?station)
               [?station :station/name ?name]])`,
      hints: [
        'West End is only on the Blue Line but Central Station is on all three lines — transfers via Central connect West End to every other served station.',
        'To find stations NOT reachable, use `not-join [?station] (reachable :west ?station)` in a query that first binds all station entities.',
      ],
      successMessage: 'You explored network connectivity and identified the unserved station (Oak Grove).',
    },
  ],
}

const lesson4: Lesson = {
  id: 'transit-4',
  title: 'Negation',
  description: 'Use not and not-join to find stops without weekend service and stations not yet on any line.',
  steps: [
    {
      id: 't4-s1',
      instruction: `## Step 1: Stops with no weekend service (\`not\`)

The dataset records weekend service with a \`:stop/weekend true\` fact on each stop that runs on Saturdays and Sundays. Bay Harbor (Blue Line stop 4) and Hill Top (Green Line stop 3) are weekday-only — they have no \`:stop/weekend\` fact at all.

\`not\` negates a pattern where all referenced variables are already bound by the outer query. Here \`?stop\` is bound by \`[?stop :stop/station ?station]\`, so checking \`(not [?stop :stop/weekend _])\` is valid.`,
      starterCode: `${SETUP}

(query [:find ?station-name
        :where [?stop :stop/station ?station]
               (not [?stop :stop/weekend _])
               [?station :station/name ?station-name]])`,
      expectedResult: {
        columns: ['?station-name'],
        rows: [['Hill Top'], ['Bay Harbor']],
      },
      hints: [
        '`not` succeeds for each `?stop` binding where no `[?stop :stop/weekend _]` triple exists at all.',
        'Only bs4 (Bay Harbor) and gs3 (Hill Top) lack a `:stop/weekend` fact — all other stops have `:stop/weekend true`.',
      ],
      successMessage: 'Hill Top and Bay Harbor — the two weekday-only stops in the network.',
    },
    {
      id: 't4-s2',
      instruction: `## Step 2: Lines with at least one weekday-only stop (\`not\`)

Find every line that has at least one stop without weekend service. The pattern joins a line to each of its stops, then applies \`not\` to filter to stop entities that lack the \`:stop/weekend\` attribute.

Red Line: all three stops run on weekends. Blue Line: Bay Harbor (stop 4) is weekday-only. Green Line: Hill Top (stop 3) is weekday-only.`,
      starterCode: `${SETUP}

(query [:find ?line-name
        :where [?line :line/name ?line-name]
               [?stop :stop/line ?line]
               (not [?stop :stop/weekend _])])`,
      expectedResult: {
        columns: ['?line-name'],
        rows: [['Green Line'], ['Blue Line']],
      },
      hints: [
        'The join `[?stop :stop/line ?line]` binds `?stop` to each stop on the line. `(not [?stop :stop/weekend _])` then filters to stops that lack the weekend flag.',
        'At least one such stop exists on the Blue Line (Bay Harbor) and the Green Line (Hill Top). The Red Line has no weekday-only stops, so it does not appear.',
      ],
      successMessage: 'Green Line and Blue Line both have weekday-only stops; the Red Line runs every day.',
    },
    {
      id: 't4-s3',
      instruction: `## Step 3: Stations not on any line (\`not-join\`)

Find stations that have no stop record on any line. Oak Grove is registered as a station but no stop entity points to it — the future route extension exists only in the bi-temporal dataset (lesson 2) and is not active in the base dataset.

\`not-join [?station]\` shares \`?station\` between the outer query and the negated pattern. For each station entity, it checks whether any stop entity references it via \`:stop/station\`. If none does, that station is included.`,
      starterCode: `${SETUP}

(query [:find ?name
        :where [?station :station/name ?name]
               (not-join [?station]
                 [_ :stop/station ?station])])`,
      expectedResult: {
        columns: ['?name'],
        rows: [['Oak Grove']],
      },
      hints: [
        '`not-join [?station]` shares `?station` with the outer query. For each station entity, it checks whether any triple `[_ :stop/station ?station]` exists. If none does, the station is unserved.',
        'Every station except Oak Grove has at least one stop entity pointing to it via `:stop/station`. Oak Grove has none.',
      ],
      successMessage: 'Oak Grove — the one station not yet served by any line.',
    },
    {
      id: 't4-s4',
      instruction: `## Step 4: Lines that do not serve a given station (open-ended)

Write a \`not-join\` that finds all lines with no stop at East Park. Then swap \`:east\` for another station keyword to see which lines skip it.

Compare these results with your reachability queries from lesson 3 — stations unreachable from a given origin are often the ones skipped by all connecting lines.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Lines with no stop at East Park
(query [:find ?line-name
        :where [?line :line/name ?line-name]
               (not-join [?line]
                 [?stop :stop/line ?line]
                 [?stop :stop/station :east])])`,
      hints: [
        '`not-join [?line]` shares the line entity with the outer query. The inner body checks whether any stop on that line serves East Park — if not, the line is returned.',
        'East Park is on the Red Line and the Green Line, so only the Blue Line passes the not-join. Swap `:east` for `:bay` or `:hill` to find the lines that miss those stations.',
      ],
      successMessage: 'You used not-join to find lines that bypass a given station.',
    },
  ],
}

const lesson5: Lesson = {
  id: 'transit-5',
  title: 'Aggregates',
  description: 'Count stops per line, measure station connectivity, and tally weekend coverage.',
  steps: [
    {
      id: 't5-s1',
      instruction: `## Step 1: Stop count per line

\`(count ?stop)\` in the \`:find\` clause counts the number of distinct stop entities matched for each group of line names.

Red Line: 3 stops. Blue Line: 4 stops (the longest route). Green Line: 3 stops.`,
      starterCode: `${SETUP}

(query [:find ?line-name (count ?stop)
        :where [?line :line/name ?line-name]
               [?stop :stop/line ?line]])`,
      expectedResult: {
        columns: ['?line-name', '(count ?stop)'],
        rows: [
          ['Blue Line', '4'],
          ['Green Line', '3'],
          ['Red Line', '3'],
        ],
      },
      hints: [
        'The join `[?stop :stop/line ?line]` groups stop entities under their line. `(count ?stop)` then counts how many stops land in each group.',
        'Blue Line has 4 stop entities (bs1–bs4); the other two lines have 3 each.',
      ],
      successMessage: 'Blue Line: 4, Red Line: 3, Green Line: 3 stops.',
    },
    {
      id: 't5-s2',
      instruction: `## Step 2: How many lines serve each station?

\`(count ?line)\` groups by station and counts how many distinct line entities a stop links it to.

Central Station sits at the intersection of all three lines — it is the most connected station. East Park is on the Red and Green Lines (2). All other served stations are on exactly one line. Oak Grove has no stops so it does not appear.`,
      starterCode: `${SETUP}

(query [:find ?station-name (count ?line)
        :where [?station :station/name ?station-name]
               [?stop :stop/station ?station]
               [?stop :stop/line ?line]])`,
      expectedResult: {
        columns: ['?station-name', '(count ?line)'],
        rows: [
          ['Bay Harbor', '1'],
          ['Central Station', '3'],
          ['East Park', '2'],
          ['Hill Top', '1'],
          ['North Gate', '1'],
          ['South Cross', '1'],
          ['West End', '1'],
        ],
      },
      hints: [
        'The join `[?stop :stop/station ?station]` and `[?stop :stop/line ?line]` pairs each station with each of its lines. `(count ?line)` counts the distinct lines per station.',
        'Oak Grove has no stop entities, so the `[?stop :stop/station ?station]` clause produces no rows for it — it is excluded from the aggregate result.',
      ],
      successMessage:
        'Central Station: 3 lines (main hub). East Park: 2 lines (secondary hub). All others: 1 line each.',
    },
    {
      id: 't5-s3',
      instruction: `## Step 3: Weekend stop count per line

Combine the aggregate with the weekend service flag from lesson 4. Count only stops that have a \`:stop/weekend true\` fact to see how many of each line's stops actually run on weekends.

Red Line: all 3 stops have weekend service (3/3). Blue Line: 3 of 4 stops have weekend service (Bay Harbor is weekday-only). Green Line: 2 of 3 stops have weekend service (Hill Top is weekday-only).`,
      starterCode: `${SETUP}

(query [:find ?line-name (count ?stop)
        :where [?line :line/name ?line-name]
               [?stop :stop/line ?line]
               [?stop :stop/weekend _]])`,
      expectedResult: {
        columns: ['?line-name', '(count ?stop)'],
        rows: [
          ['Blue Line', '3'],
          ['Green Line', '2'],
          ['Red Line', '3'],
        ],
      },
      hints: [
        'Adding `[?stop :stop/weekend _]` to the `:where` clause restricts the join to stops that have a weekend fact — weekday-only stops are naturally excluded before the count.',
        'Blue Line has 4 stops total but only 3 have `:stop/weekend true`. Green Line has 3 stops but only 2 run on weekends.',
      ],
      successMessage: 'Red Line: 3/3 weekend stops. Blue Line: 3/4. Green Line: 2/3.',
    },
    {
      id: 't5-s4',
      instruction: `## Step 4: Explore maximum stop position per line (open-ended)

\`(max ?order)\` returns the highest stop-order value within each line group — effectively the index of the last stop, which equals the total number of stops on a linear route.

You can also try \`(min ?order)\` to confirm all lines start at position 1, or compare the weekend count from step 3 with the total count from step 1 to reason about weekend coverage fractions.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Max stop position per line (= number of stops on each linear route)
(query [:find ?line-name (max ?order)
        :where [?line :line/name ?line-name]
               [?stop :stop/line ?line]
               [?stop :stop/order ?order]])`,
      hints: [
        '`(max ?order)` picks the largest `:stop/order` value within each line group. For sequential routes this equals the number of stops.',
        'Try `(min ?order)` alongside `(max ?order)` in the same `:find` clause to confirm every line starts at position 1.',
      ],
      successMessage: 'You explored aggregate functions on ordered stop data.',
    },
  ],
}

export const tutorialTransit: Tutorial = {
  id: 'transit',
  title: 'City Transit Network',
  description: 'Model stations, lines, timetable changes, and service suspensions.',
  goals: 'recursive reachability, shortest path by hops, future-dated valid-time, and retroactive suspensions',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1, lesson2, lesson3, lesson4, lesson5],
}
