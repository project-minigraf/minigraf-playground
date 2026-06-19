import type { Lesson, Tutorial } from '@/lib/types'

const SETUP = `; Sellers
(transact [[:corestore-direct :seller/name "Corestore Direct"]
           [:corestore-direct :seller/sla-days 3]
           [:techsource :seller/name "TechSource"]
           [:techsource :seller/sla-days 7]
           [:gadgethaus :seller/name "GadgetHaus"]
           [:gadgethaus :seller/sla-days 5]])

; Products
(transact [[:laptop-pro :product/name "LaptopPro 15"]
           [:phone-x :product/name "PhoneX 12"]
           [:nc-headphones :product/name "NoiseCancel Pro"]
           [:usb-cable :product/name "USB-C Cable"]
           [:keyboard-k1 :product/name "Compact Keyboard"]])

; Seller listings (per-seller pricing)
(transact [[:listing-cd-laptop :listing/seller :corestore-direct]
           [:listing-cd-laptop :listing/product :laptop-pro]
           [:listing-cd-laptop :listing/price 1299]
           [:listing-ts-laptop :listing/seller :techsource]
           [:listing-ts-laptop :listing/product :laptop-pro]
           [:listing-ts-laptop :listing/price 1249]
           [:listing-cd-phone :listing/seller :corestore-direct]
           [:listing-cd-phone :listing/product :phone-x]
           [:listing-cd-phone :listing/price 799]
           [:listing-gh-phone :listing/seller :gadgethaus]
           [:listing-gh-phone :listing/product :phone-x]
           [:listing-gh-phone :listing/price 819]
           [:listing-cd-nc :listing/seller :corestore-direct]
           [:listing-cd-nc :listing/product :nc-headphones]
           [:listing-cd-nc :listing/price 249]
           [:listing-ts-nc :listing/seller :techsource]
           [:listing-ts-nc :listing/product :nc-headphones]
           [:listing-ts-nc :listing/price 229]
           [:listing-cd-usb :listing/seller :corestore-direct]
           [:listing-cd-usb :listing/product :usb-cable]
           [:listing-cd-usb :listing/price 19]
           [:listing-ts-keyboard :listing/seller :techsource]
           [:listing-ts-keyboard :listing/product :keyboard-k1]
           [:listing-ts-keyboard :listing/price 89]])

; Customers
(transact [[:alice :customer/name "Alice"]
           [:ben :customer/name "Ben"]
           [:clara :customer/name "Clara"]])

; Orders
(transact [[:order-a1 :order/customer :alice]
           [:order-a1 :order/seller :corestore-direct]
           [:order-a1 :order/status :delivered]
           [:order-b1 :order/customer :ben]
           [:order-b1 :order/seller :techsource]
           [:order-b1 :order/status :delivered]
           [:order-c1 :order/customer :clara]
           [:order-c1 :order/seller :gadgethaus]
           [:order-c1 :order/status :placed]
           [:order-a2 :order/customer :alice]
           [:order-a2 :order/seller :corestore-direct]
           [:order-a2 :order/status :placed]])

; Order items
(transact [[:order-a1-i1 :item/order :order-a1]
           [:order-a1-i1 :item/product :laptop-pro]
           [:order-a1-i1 :item/price 1299]
           [:order-b1-i1 :item/order :order-b1]
           [:order-b1-i1 :item/product :laptop-pro]
           [:order-b1-i1 :item/price 1249]
           [:order-b1-i2 :item/order :order-b1]
           [:order-b1-i2 :item/product :nc-headphones]
           [:order-b1-i2 :item/price 229]
           [:order-c1-i1 :item/order :order-c1]
           [:order-c1-i1 :item/product :phone-x]
           [:order-c1-i1 :item/price 819]
           [:order-a2-i1 :item/order :order-a2]
           [:order-a2-i1 :item/product :usb-cable]
           [:order-a2-i1 :item/price 19]])`

// Lesson 2 variant: TechSource laptop price set via valid-time only (no permanent price).
// This prevents duplicate rows when querying with :valid-at.
const SETUP_L2 = `; Sellers
(transact [[:corestore-direct :seller/name "Corestore Direct"]
           [:corestore-direct :seller/sla-days 3]
           [:techsource :seller/name "TechSource"]
           [:techsource :seller/sla-days 7]
           [:gadgethaus :seller/name "GadgetHaus"]
           [:gadgethaus :seller/sla-days 5]])

; Products
(transact [[:laptop-pro :product/name "LaptopPro 15"]
           [:phone-x :product/name "PhoneX 12"]
           [:nc-headphones :product/name "NoiseCancel Pro"]
           [:usb-cable :product/name "USB-C Cable"]
           [:keyboard-k1 :product/name "Compact Keyboard"]])

; Seller listings — TechSource laptop omits permanent price; set via valid-time below
(transact [[:listing-cd-laptop :listing/seller :corestore-direct]
           [:listing-cd-laptop :listing/product :laptop-pro]
           [:listing-cd-laptop :listing/price 1299]
           [:listing-ts-laptop :listing/seller :techsource]
           [:listing-ts-laptop :listing/product :laptop-pro]
           [:listing-cd-phone :listing/seller :corestore-direct]
           [:listing-cd-phone :listing/product :phone-x]
           [:listing-cd-phone :listing/price 799]
           [:listing-gh-phone :listing/seller :gadgethaus]
           [:listing-gh-phone :listing/product :phone-x]
           [:listing-gh-phone :listing/price 819]
           [:listing-cd-nc :listing/seller :corestore-direct]
           [:listing-cd-nc :listing/product :nc-headphones]
           [:listing-cd-nc :listing/price 249]
           [:listing-ts-nc :listing/seller :techsource]
           [:listing-ts-nc :listing/product :nc-headphones]
           [:listing-ts-nc :listing/price 229]
           [:listing-cd-usb :listing/seller :corestore-direct]
           [:listing-cd-usb :listing/product :usb-cable]
           [:listing-cd-usb :listing/price 19]
           [:listing-ts-keyboard :listing/seller :techsource]
           [:listing-ts-keyboard :listing/product :keyboard-k1]
           [:listing-ts-keyboard :listing/price 89]])

; Customers
(transact [[:alice :customer/name "Alice"]
           [:ben :customer/name "Ben"]
           [:clara :customer/name "Clara"]])

; Orders
(transact [[:order-a1 :order/customer :alice]
           [:order-a1 :order/seller :corestore-direct]
           [:order-a1 :order/status :delivered]
           [:order-b1 :order/customer :ben]
           [:order-b1 :order/seller :techsource]
           [:order-b1 :order/status :delivered]
           [:order-c1 :order/customer :clara]
           [:order-c1 :order/seller :gadgethaus]
           [:order-c1 :order/status :placed]
           [:order-a2 :order/customer :alice]
           [:order-a2 :order/seller :corestore-direct]
           [:order-a2 :order/status :placed]])

; Order items
(transact [[:order-a1-i1 :item/order :order-a1]
           [:order-a1-i1 :item/product :laptop-pro]
           [:order-a1-i1 :item/price 1299]
           [:order-b1-i1 :item/order :order-b1]
           [:order-b1-i1 :item/product :laptop-pro]
           [:order-b1-i1 :item/price 1249]
           [:order-b1-i2 :item/order :order-b1]
           [:order-b1-i2 :item/product :nc-headphones]
           [:order-b1-i2 :item/price 229]
           [:order-c1-i1 :item/order :order-c1]
           [:order-c1-i1 :item/product :phone-x]
           [:order-c1-i1 :item/price 819]
           [:order-a2-i1 :item/order :order-a2]
           [:order-a2-i1 :item/product :usb-cable]
           [:order-a2-i1 :item/price 19]])

; TechSource laptop price history (valid-time only — no permanent price above)
(transact {:valid-from "2025-01-01" :valid-to "2025-12-31"}
  [[:listing-ts-laptop :listing/price 1299]])

(transact {:valid-from "2026-01-01"}
  [[:listing-ts-laptop :listing/price 1249]])`

const lesson2: Lesson = {
  id: 'marketplace-2',
  title: 'Temporal price queries',
  description: 'Use valid-time snapshots to inspect historical seller pricing and compare which seller was cheapest on a given date.',
  steps: [
    {
      id: 'm2-s1',
      instruction: `## Step 1: Observe the price history

TechSource dropped the LaptopPro 15 price from $1,299 to $1,249 at the start of 2026. The dataset records this as two valid-time facts on the same listing entity.

Run the setup and query — without \`:valid-at\`, you see only the currently valid price for TechSource alongside the permanent Corestore price.`,
      starterCode: `${SETUP_L2}

(query [:find ?seller-name ?product-name ?price
        :where [?listing :listing/product :laptop-pro]
               [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/price ?price]
               [:laptop-pro :product/name ?product-name]])`,
      expectedResult: {
        columns: ['?seller-name', '?product-name', '?price'],
        rows: [
          ['Corestore Direct', 'LaptopPro 15', '1299'],
          ['TechSource', 'LaptopPro 15', '1249'],
        ],
      },
      hints: [
        'Without `:valid-at`, the query sees facts valid at the current date (2026). TechSource\'s current price is 1249.',
        'The listing entity `:listing-ts-laptop` has no permanent price — only the valid-time transactions carry that attribute.',
      ],
      successMessage: 'Both sellers visible, TechSource showing its current 2026 price.',
    },
    {
      id: 'm2-s2',
      instruction: `## Step 2: Snapshot at a past date

Add \`:valid-at "2025-06-01"\` to the query. This asks: "what prices were in effect on 1 June 2025?" TechSource's old price (1,299) becomes visible — the same as Corestore's.`,
      starterCode: `${SETUP_L2}

(query [:find ?seller-name ?product-name ?price
        :valid-at "2025-06-01"
        :where [?listing :listing/product :laptop-pro]
               [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/price ?price]
               [:laptop-pro :product/name ?product-name]])`,
      expectedResult: {
        columns: ['?seller-name', '?product-name', '?price'],
        rows: [
          ['Corestore Direct', 'LaptopPro 15', '1299'],
          ['TechSource', 'LaptopPro 15', '1299'],
        ],
      },
      hints: [
        '`:valid-at` filters to facts whose valid-time range covers the given date — 2025-06-01 falls within the 2025-01-01/2025-12-31 window.',
        'Both sellers show 1299: before the price drop, TechSource had no advantage.',
      ],
      successMessage: 'Mid-2025 snapshot: both sellers priced equally at 1,299.',
    },
    {
      id: 'm2-s3',
      instruction: `## Step 3: Identify the cheaper seller after the price drop

Change \`:valid-at\` to \`"2026-06-01"\` and add an expression clause \`[(< ?price 1260)]\` to keep only the seller that undercuts the threshold — TechSource at 1,249.`,
      starterCode: `${SETUP_L2}

(query [:find ?seller-name ?product-name ?price
        :valid-at "2026-06-01"
        :where [?listing :listing/product :laptop-pro]
               [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/price ?price]
               [:laptop-pro :product/name ?product-name]
               [(< ?price 1260)]])`,
      expectedResult: {
        columns: ['?seller-name', '?product-name', '?price'],
        rows: [['TechSource', 'LaptopPro 15', '1249']],
      },
      hints: [
        'Remove the expression clause to see both sellers at their 2026 prices (Corestore 1299, TechSource 1249).',
        '`:valid-at` and expression clauses compose freely — the temporal filter applies first, then the expression filters the surviving rows.',
      ],
      successMessage: 'TechSource isolated as the cheaper option after the 2026 price drop.',
    },
    {
      id: 'm2-s4',
      instruction: `## Step 4: Model your own price change

Pick any product, assert two valid-time price facts for it (an old price for 2024 and a new price from 2025 onwards), then write two queries — one at \`"2024-06-01"\` and one at \`"2025-06-01"\` — to show the change.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP_L2}

; Assert a price change for a product of your choice
(transact {:valid-from "2024-01-01" :valid-to "2024-12-31"}
  [[:listing-gh-phone :listing/price 899]])

(transact {:valid-from "2025-01-01"}
  [[:listing-gh-phone :listing/price 819]])

; Query 1: price in 2024
(query [:find ?seller-name ?product-name ?price
        :valid-at "2024-06-01"
        :where [?listing :listing/product :phone-x]
               [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/price ?price]
               [:phone-x :product/name ?product-name]])

; Query 2: price in 2025
(query [:find ?seller-name ?product-name ?price
        :valid-at "2025-06-01"
        :where [?listing :listing/product :phone-x]
               [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/price ?price]
               [:phone-x :product/name ?product-name]])`,
      hints: [
        'The starter code shows GadgetHaus reducing the PhoneX price from 899 to 819 — swap in your own product and numbers.',
        'Make sure your two valid-time ranges are non-overlapping to avoid duplicate rows.',
      ],
      successMessage: 'You modelled a price change and queried it at two points in valid time.',
    },
  ],
}

const lesson1: Lesson = {
  id: 'marketplace-1',
  title: 'Multi-seller joins',
  description: 'Query across sellers, products, and orders using multi-hop joins and expression clause filters.',
  steps: [
    {
      id: 'm1-s1',
      instruction: `## Step 1: List all orders with customer and seller

The marketplace dataset has sellers, products, listings (per-seller pricing), customers, orders, and order items. Run the setup and query to see every order alongside its customer name and seller name.

The query walks three entity hops: \`order → :order/customer → :customer/name\` and \`order → :order/seller → :seller/name\`.`,
      starterCode: `${SETUP}

(query [:find ?customer-name ?seller-name ?status
        :where [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]
               [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?order :order/status ?status]])`,
      expectedResult: {
        columns: ['?customer-name', '?seller-name', '?status'],
        rows: [
          ['Alice', 'Corestore Direct', ':delivered'],
          ['Ben', 'TechSource', ':delivered'],
          ['Clara', 'GadgetHaus', ':placed'],
          ['Alice', 'Corestore Direct', ':placed'],
        ],
      },
      hints: [
        'Each `[pattern]` clause narrows the set of matching bindings — chain them to walk entity relationships.',
        'Variables like `?cust` and `?seller` act as join keys: whatever `?order` binds for `:order/customer`, `?cust` carries into the next clause.',
      ],
      successMessage: 'All four orders retrieved with their customer and seller names.',
    },
    {
      id: 'm1-s2',
      instruction: `## Step 2: Filter orders by seller

Add a keyword literal clause to restrict results to a single seller. Placing \`[?order :order/seller :techsource]\` before the name join means only orders whose seller is exactly \`:techsource\` survive.`,
      starterCode: `${SETUP}

(query [:find ?customer-name ?status
        :where [?order :order/seller :techsource]
               [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]
               [?order :order/status ?status]])`,
      expectedResult: {
        columns: ['?customer-name', '?status'],
        rows: [['Ben', ':delivered']],
      },
      hints: [
        'Using a keyword literal like `:techsource` instead of a variable binds the pattern to that exact entity.',
        'Order of clauses does not change the result, but putting the most selective clause first can help you reason about the query.',
      ],
      successMessage: "Filtered to TechSource's single order — Ben's delivered purchase.",
    },
    {
      id: 'm1-s3',
      instruction: `## Step 3: Compare prices across sellers

The listing entity bridges a seller to a product with a price. Query all listings to see every seller's price for every product, then add an expression clause \`[(< ?price 300)]\` to surface only the budget items.`,
      starterCode: `${SETUP}

(query [:find ?seller-name ?product-name ?price
        :where [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/product ?product]
               [?product :product/name ?product-name]
               [?listing :listing/price ?price]
               [(< ?price 300)]])`,
      expectedResult: {
        columns: ['?seller-name', '?product-name', '?price'],
        rows: [
          ['Corestore Direct', 'NoiseCancel Pro', '249'],
          ['TechSource', 'NoiseCancel Pro', '229'],
          ['Corestore Direct', 'USB-C Cable', '19'],
          ['TechSource', 'Compact Keyboard', '89'],
        ],
      },
      hints: [
        'Expression clauses like `[(< ?price 300)]` filter rows after all triple patterns are matched — all variables must already be bound.',
        'Remove the expression clause to see all 8 listings and observe that NoiseCancel Pro appears twice (one listing per seller).',
      ],
      successMessage: 'Cross-seller price comparison working — the listing entity is the join bridge.',
    },
    {
      id: 'm1-s4',
      instruction: `## Step 4: Find fast sellers

Write a query that lists every seller name alongside its SLA commitment (in days), then add an expression clause to keep only sellers with an SLA of fewer than 6 days.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Query all sellers and their SLA, then filter for fast ones
(query [:find ?seller-name ?sla
        :where [?seller :seller/name ?seller-name]
               [?seller :seller/sla-days ?sla]])`,
      hints: [
        'Add `[(< ?sla 6)]` after the two triple patterns to filter the results.',
        'Corestore Direct (3 days) and GadgetHaus (5 days) both qualify; TechSource (7 days) does not.',
      ],
      successMessage: 'You filtered sellers by a numeric attribute using an expression clause.',
    },
  ],
}

const lesson3: Lesson = {
  id: 'marketplace-3',
  title: 'Aggregates per seller',
  description: 'Use count, sum, and max to compute order totals and revenue figures grouped by seller.',
  steps: [
    {
      id: 'm3-s1',
      instruction: `## Step 1: Count orders per seller

\`(count ?order)\` in the \`:find\` clause counts rows. When mixed with a plain variable like \`?seller-name\`, results are grouped by that variable — one row per distinct seller name.`,
      starterCode: `${SETUP}

(query [:find ?seller-name (count ?order)
        :where [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]])`,
      expectedResult: {
        columns: ['?seller-name', '(count ?order)'],
        rows: [
          ['Corestore Direct', '2'],
          ['GadgetHaus', '1'],
          ['TechSource', '1'],
        ],
      },
      hints: [
        'Minigraf groups by all plain variables in `:find` and aggregates within each group.',
        'Alice has two orders from Corestore Direct, so that seller gets a count of 2.',
      ],
      successMessage: 'Order counts per seller computed correctly.',
    },
    {
      id: 'm3-s2',
      instruction: `## Step 2: Total revenue per seller

Join from order → order item → item price, then use \`(sum ?price)\` grouped by seller. Add \`:with ?item\` to ensure two items with the same price are counted as separate contributions — otherwise they would collapse into a single row before summing.`,
      starterCode: `${SETUP}

(query [:find ?seller-name (sum ?price)
        :with ?item
        :where [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?item :item/order ?order]
               [?item :item/price ?price]])`,
      expectedResult: {
        columns: ['?seller-name', '(sum ?price)'],
        rows: [
          ['Corestore Direct', '1318'],
          ['GadgetHaus', '819'],
          ['TechSource', '1478'],
        ],
      },
      hints: [
        'Corestore Direct: laptop 1299 + usb-cable 19 = 1318. TechSource: laptop 1249 + headphones 229 = 1478.',
        '`:with ?item` adds the item entity to the grouping key so that two items at the same price are not merged before `sum` runs.',
      ],
      successMessage: 'Revenue totals match: TechSource leads at 1,478 despite a lower unit price.',
    },
    {
      id: 'm3-s3',
      instruction: `## Step 3: Most expensive item ever sold per seller

Swap \`sum\` for \`max\` on the same join path. \`(max ?price)\` returns the highest single-item price within each seller group.`,
      starterCode: `${SETUP}

(query [:find ?seller-name (max ?price)
        :where [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?item :item/order ?order]
               [?item :item/price ?price]])`,
      expectedResult: {
        columns: ['?seller-name', '(max ?price)'],
        rows: [
          ['Corestore Direct', '1299'],
          ['GadgetHaus', '819'],
          ['TechSource', '1249'],
        ],
      },
      hints: [
        '`:with` is not needed for `max` — duplicate values do not affect the maximum.',
        'Corestore\'s max is 1299 (Alice\'s laptop); TechSource\'s is 1249 (Ben\'s discounted laptop).',
      ],
      successMessage: 'Max item price per seller surfaced correctly.',
    },
    {
      id: 'm3-s4',
      instruction: `## Step 4: Count distinct customers per seller

Write a query that uses \`(count-distinct ?customer)\` to find how many unique customers have ordered from each seller. Then extend it with an expression clause to keep only sellers with more than one distinct customer.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Count distinct customers per seller
(query [:find ?seller-name (count-distinct ?customer)
        :where [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?order :order/customer ?customer]])`,
      hints: [
        'Alice placed two orders with Corestore Direct but she is one distinct customer — `count-distinct` handles this correctly.',
        'Add `[(> ?count 1)]` ... but you\'ll need to bind the aggregate result to a variable first with `:with` or restructure. The tutor can guide you.',
      ],
      successMessage: 'You used count-distinct to deduplicate customers across orders.',
    },
  ],
}

export const tutorialMarketplace: Tutorial = {
  id: 'marketplace',
  title: 'Corestore Marketplace',
  description: 'Model a multi-seller e-commerce platform with temporal price tracking.',
  goals: 'multi-seller joins, temporal price comparison, aggregates per seller, negation, and disjunction',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1, lesson2, lesson3],
}
