# Marketplace Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill in `lib/lessons/tutorial-marketplace.ts` with 5 lessons teaching multi-seller joins, temporal price queries, aggregates, negation, and disjunction using the Corestore Marketplace dataset.

**Architecture:** Each lesson is a `Lesson` object added to the `tutorialMarketplace.lessons` array. Each step is self-contained — its `starterCode` includes the full dataset setup via a shared constant at the top of the file. Lesson 2 uses a modified dataset variant that omits the permanent price for `:listing-ts-laptop` so valid-time queries return clean single-row results. Tests are structural: they verify lesson IDs, step counts, and that non-open-ended steps have `expectedResult`.

**Tech Stack:** TypeScript, Minigraf Datalog (EDN syntax), Jest

> **Important — expected result row order:** The exact row order returned by the WASM for multi-row results is not guaranteed by this plan. After implementing each lesson, run `npm run dev`, open the marketplace tutorial, execute each step's `starterCode` in the playground, and compare the actual output to the `expectedResult` set in the code. Adjust row order in `expectedResult` if needed before committing. Numeric values (prices, counts) appear as strings in `rows` since `QueryResult.rows` is `string[][]`.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `lib/lessons/tutorial-marketplace.ts` | Modify | Replace `lessons: []` with 5 `Lesson` objects |
| `__tests__/lib/lessons.test.ts` | Modify | Add marketplace-specific structural tests |

No new files, types, hooks, or dependencies needed.

---

## Shared dataset

Both constants below go at the top of `tutorial-marketplace.ts`, after the imports. They are interpolated into each step's `starterCode` via template literals.

### `SETUP` (Lessons 1, 3, 4, 5)

```
; Sellers
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
           [:order-a2-i1 :item/price 19]])
```

### `SETUP_L2` (Lesson 2 only)

Identical to `SETUP` except the seller listings transact **omits** `:listing-ts-laptop :listing/price 1249` (that attribute is set via valid-time transactions below), and two temporal transacts are appended:

```
; Seller listings (TechSource laptop has no permanent price — set via valid-time below)
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

; ... (same customers, orders, order items as SETUP) ...

; TechSource laptop price history (valid-time only)
(transact {:valid-from "2025-01-01" :valid-to "2025-12-31"}
  [[:listing-ts-laptop :listing/price 1299]])

(transact {:valid-from "2026-01-01"}
  [[:listing-ts-laptop :listing/price 1249]])
```

---

## Task 1 — Lesson 1: Multi-seller joins

**Files:**
- Modify: `lib/lessons/tutorial-marketplace.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `__tests__/lib/lessons.test.ts` inside the existing top-level describe, after the existing tests:

```typescript
describe('marketplace tutorial', () => {
  const marketplace = TUTORIALS.find((t) => t.id === 'marketplace')!

  describe('lesson 1 — multi-seller joins', () => {
    it('exists with correct id', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-1')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-1')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      marketplace.lessons.find((l) => l.id === 'marketplace-1')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-1')!.steps[3].expectedResult).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — `marketplace.lessons.find(...)` returns `undefined` because `lessons: []`.

- [ ] **Step 3: Implement Lesson 1**

Replace `tutorial-marketplace.ts` entirely with:

```typescript
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

export const tutorialMarketplace: Tutorial = {
  id: 'marketplace',
  title: 'Corestore Marketplace',
  description: 'Model a multi-seller e-commerce platform with temporal price tracking.',
  goals: 'multi-seller joins, temporal price comparison, aggregates per seller, negation, and disjunction',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1],
}
```

- [ ] **Step 4: Verify expected result row order in browser**

```bash
npm run dev
```

Navigate to the Marketplace tutorial → Lesson 1. Run each of steps 1–3's starter code and compare the actual output rows to the `expectedResult` arrays. Adjust row order in the code if they differ.

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests in `lessons.test.ts` PASS (existing tests unaffected; new marketplace tests pass).

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-marketplace.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add marketplace lesson 1 — multi-seller joins"
```

---

## Task 2 — Lesson 2: Temporal price queries

**Files:**
- Modify: `lib/lessons/tutorial-marketplace.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the existing `describe('marketplace tutorial')` block in `__tests__/lib/lessons.test.ts`:

```typescript
describe('lesson 2 — temporal price queries', () => {
  it('exists with correct id', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-2')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-2')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    marketplace.lessons.find((l) => l.id === 'marketplace-2')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-2')!.steps[3].expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `marketplace-2` not found.

- [ ] **Step 3: Add the `SETUP_L2` constant and `lesson2` to `tutorial-marketplace.ts`**

After the `SETUP` constant, add:

```typescript
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
```

Then add `lesson2` to the `lessons` array in the exported `tutorialMarketplace`:

```typescript
lessons: [lesson1, lesson2],
```

- [ ] **Step 4: Verify expected result row order in browser**

```bash
npm run dev
```

Run steps 1–3 of Lesson 2 in the playground and compare actual output to `expectedResult`. Adjust row order if needed.

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-marketplace.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add marketplace lesson 2 — temporal price queries"
```

---

## Task 3 — Lesson 3: Aggregates per seller

**Files:**
- Modify: `lib/lessons/tutorial-marketplace.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('marketplace tutorial')` in `__tests__/lib/lessons.test.ts`:

```typescript
describe('lesson 3 — aggregates per seller', () => {
  it('exists with correct id', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-3')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-3')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    marketplace.lessons.find((l) => l.id === 'marketplace-3')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-3')!.steps[3].expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `marketplace-3` not found.

- [ ] **Step 3: Add `lesson3` to `tutorial-marketplace.ts`**

Add after `lesson2`:

```typescript
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
```

Add `lesson3` to the exported `lessons` array:

```typescript
lessons: [lesson1, lesson2, lesson3],
```

- [ ] **Step 4: Verify expected result row order and number format in browser**

```bash
npm run dev
```

Run steps 1–3 of Lesson 3. Numbers may come back as integers rather than strings depending on WASM output — adjust the `expectedResult` rows to match actual output exactly.

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-marketplace.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add marketplace lesson 3 — aggregates per seller"
```

---

## Task 4 — Lesson 4: Negation across sellers

**Files:**
- Modify: `lib/lessons/tutorial-marketplace.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('marketplace tutorial')` in `__tests__/lib/lessons.test.ts`:

```typescript
describe('lesson 4 — negation across sellers', () => {
  it('exists with correct id', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-4')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-4')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    marketplace.lessons.find((l) => l.id === 'marketplace-4')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-4')!.steps[3].expectedResult).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL.

- [ ] **Step 3: Add `lesson4` to `tutorial-marketplace.ts`**

Add after `lesson3`:

```typescript
const lesson4: Lesson = {
  id: 'marketplace-4',
  title: 'Negation across sellers',
  description: 'Use not and not-join to find products, sellers, and customers defined by the absence of a relationship.',
  steps: [
    {
      id: 'm4-s1',
      instruction: `## Step 1: Products not listed by TechSource

\`not-join\` excludes outer bindings when a sub-pattern can be satisfied. Here: for each product, check whether there EXISTS a listing entity that links it to \`:techsource\`. If one exists, exclude that product.

The join variable \`[?product]\` is shared with the outer query; \`?listing\` is private to the \`not-join\` body.`,
      starterCode: `${SETUP}

(query [:find ?product-name
        :where [?product :product/name ?product-name]
               (not-join [?product]
                         [?listing :listing/product ?product]
                         [?listing :listing/seller :techsource])])`,
      expectedResult: {
        columns: ['?product-name'],
        rows: [['PhoneX 12'], ['USB-C Cable']],
      },
      hints: [
        'TechSource lists laptop-pro, nc-headphones, and keyboard-k1 — those three are excluded.',
        '`not-join` is needed (rather than plain `not`) because `?listing` is a fresh inner variable not bound by any outer clause.',
      ],
      successMessage: 'PhoneX 12 and USB-C Cable have no TechSource listing — correctly excluded.',
    },
    {
      id: 'm4-s2',
      instruction: `## Step 2: Sellers with no delivered orders

Plain \`not\` excludes a binding when a pattern matches it. All variables inside the \`not\` body must already be bound by outer clauses.

Find every seller, then exclude any whose entity appears in a delivered order.`,
      starterCode: `${SETUP}

(query [:find ?seller-name
        :where [?seller :seller/name ?seller-name]
               (not [?order :order/seller ?seller]
                    [?order :order/status :delivered])])`,
      expectedResult: {
        columns: ['?seller-name'],
        rows: [['GadgetHaus']],
      },
      hints: [
        'Corestore Direct has order-a1 (:delivered) and TechSource has order-b1 (:delivered) — both are excluded.',
        'GadgetHaus only has order-c1 (:placed) — no delivered order exists, so it survives.',
      ],
      successMessage: 'GadgetHaus is the only seller with no fulfilled orders yet.',
    },
    {
      id: 'm4-s3',
      instruction: `## Step 3: Products listed by Corestore Direct but not GadgetHaus

Chain two patterns: first require a Corestore listing to exist for the product, then use \`not-join\` to exclude products that also have a GadgetHaus listing.

GadgetHaus only lists PhoneX 12, so that product is the one removed.`,
      starterCode: `${SETUP}

(query [:find ?product-name
        :where [?product :product/name ?product-name]
               [?cd-listing :listing/product ?product]
               [?cd-listing :listing/seller :corestore-direct]
               (not-join [?product]
                         [?gh-listing :listing/product ?product]
                         [?gh-listing :listing/seller :gadgethaus])])`,
      expectedResult: {
        columns: ['?product-name'],
        rows: [['LaptopPro 15'], ['NoiseCancel Pro'], ['USB-C Cable']],
      },
      hints: [
        'The outer clause `[?cd-listing :listing/seller :corestore-direct]` limits to Corestore products first: laptop-pro, phone-x, nc-headphones, usb-cable.',
        'The `not-join` then removes phone-x (GadgetHaus has a listing for it), leaving three products.',
      ],
      successMessage: 'Three products are exclusive to Corestore Direct vs GadgetHaus.',
    },
    {
      id: 'm4-s4',
      instruction: `## Step 4: Customers with no placed orders

Write a query that finds customers who have no order in the \`:placed\` status — either all their orders are delivered or they haven't placed anything.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Find customers with no placed orders
(query [:find ?customer-name
        :where [?customer :customer/name ?customer-name]
               (not-join [?customer]
                         [?order :order/customer ?customer]
                         [?order :order/status :placed])])`,
      hints: [
        'Alice has a placed order (order-a2) and Clara has order-c1 (:placed) — both should be excluded.',
        'Ben only has order-b1 (:delivered) — he has no placed order so he survives.',
      ],
      successMessage: 'You used not-join to find customers defined by the absence of a relationship.',
    },
  ],
}
```

Add `lesson4` to the `lessons` array:

```typescript
lessons: [lesson1, lesson2, lesson3, lesson4],
```

- [ ] **Step 4: Verify expected result row order in browser**

```bash
npm run dev
```

Run steps 1–3 of Lesson 4 and adjust row order in `expectedResult` to match actual WASM output.

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern=lessons
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-marketplace.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add marketplace lesson 4 — negation across sellers"
```

---

## Task 5 — Lesson 5: Disjunction and synthesis

**Files:**
- Modify: `lib/lessons/tutorial-marketplace.ts`
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Write the failing tests**

Add inside `describe('marketplace tutorial')` in `__tests__/lib/lessons.test.ts`:

```typescript
describe('lesson 5 — disjunction and synthesis', () => {
  it('exists with correct id', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-5')).toBeDefined()
  })
  it('has 4 steps', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-5')!.steps).toHaveLength(4)
  })
  it('steps 1-3 have expectedResult', () => {
    marketplace.lessons.find((l) => l.id === 'marketplace-5')!.steps.slice(0, 3).forEach((s) => {
      expect(s.expectedResult).toBeDefined()
    })
  })
  it('step 4 is open-ended', () => {
    expect(marketplace.lessons.find((l) => l.id === 'marketplace-5')!.steps[3].expectedResult).toBeUndefined()
  })
})

// Final structural tests — pass only once all 5 lessons are present
it('has exactly 5 lessons', () => {
  expect(marketplace.lessons).toHaveLength(5)
})

it('step IDs are unique within marketplace tutorial', () => {
  const ids = marketplace.lessons.flatMap((l) => l.steps.map((s) => s.id))
  expect(ids.length).toBe(new Set(ids).size)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=lessons
```

Expected: FAIL — lesson `marketplace-5` not found, and `lessons` has length 4.

- [ ] **Step 3: Add `lesson5` to `tutorial-marketplace.ts`**

Add after `lesson4`:

```typescript
const lesson5: Lesson = {
  id: 'marketplace-5',
  title: 'Disjunction and synthesis',
  description: 'Use or and or-join to match across seller alternatives, then combine with negation in a single synthesis query.',
  steps: [
    {
      id: 'm5-s1',
      instruction: `## Step 1: Orders from Corestore Direct OR GadgetHaus

\`or\` unions the results of multiple branches. Both branches here match on \`:order/seller\`, so a plain \`or\` (not \`or-join\`) works — all branches bind the same variables.

TechSource orders are excluded because neither branch matches \`:techsource\`.`,
      starterCode: `${SETUP}

(query [:find ?customer-name ?seller-name ?status
        :where [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]
               [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?order :order/status ?status]
               (or [?order :order/seller :corestore-direct]
                   [?order :order/seller :gadgethaus])])`,
      expectedResult: {
        columns: ['?customer-name', '?seller-name', '?status'],
        rows: [
          ['Alice', 'Corestore Direct', ':delivered'],
          ['Alice', 'Corestore Direct', ':placed'],
          ['Clara', 'GadgetHaus', ':placed'],
        ],
      },
      hints: [
        'The `or` clause is evaluated after the other patterns — `?order` is already bound, so each branch is tested against it.',
        'Ben\'s TechSource order matches neither branch and is excluded from the union.',
      ],
      successMessage: "Three orders from Corestore Direct and GadgetHaus — Ben's TechSource order excluded.",
    },
    {
      id: 'm5-s2',
      instruction: `## Step 2: Define a \`marketplace-seller\` rule

Define a rule that identifies third-party sellers (TechSource or GadgetHaus) using \`or\` in the rule body. Then query all orders placed through a marketplace seller.`,
      starterCode: `${SETUP}

(rule [(marketplace-seller ?seller)
       (or [?seller :seller/name "TechSource"]
           [?seller :seller/name "GadgetHaus"])])

(query [:find ?customer-name ?seller-name
        :where (marketplace-seller ?seller)
               [?seller :seller/name ?seller-name]
               [?order :order/seller ?seller]
               [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]])`,
      expectedResult: {
        columns: ['?customer-name', '?seller-name'],
        rows: [
          ['Ben', 'TechSource'],
          ['Clara', 'GadgetHaus'],
        ],
      },
      hints: [
        'The rule head `(marketplace-seller ?seller)` is a derived predicate — query it like a base triple pattern.',
        'Rules are not persisted in the WASM instance across resets; the `rule` form must appear in the same code block as the `query`.',
      ],
      successMessage: 'Rule with disjunction working — both marketplace orders retrieved.',
    },
    {
      id: 'm5-s3',
      instruction: `## Step 3: Combine negation and disjunction

Find orders from Corestore Direct OR GadgetHaus that have NOT yet been delivered. This combines \`or\` (for the seller alternatives) and \`not\` (for the status absence) in a single \`:where\` clause.`,
      starterCode: `${SETUP}

(query [:find ?customer-name ?seller-name ?status
        :where [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]
               [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?order :order/status ?status]
               (or [?order :order/seller :corestore-direct]
                   [?order :order/seller :gadgethaus])
               (not [?order :order/status :delivered])])`,
      expectedResult: {
        columns: ['?customer-name', '?seller-name', '?status'],
        rows: [
          ['Alice', 'Corestore Direct', ':placed'],
          ['Clara', 'GadgetHaus', ':placed'],
        ],
      },
      hints: [
        'order-a1 (Alice × Corestore Direct × :delivered) is excluded by the `not` clause even though it matches the `or`.',
        '`or` and `not` are independent clauses in `:where` — they both apply to every candidate binding.',
      ],
      successMessage: 'Two pending orders surfaced by combining disjunction and negation in one query.',
    },
    {
      id: 'm5-s4',
      instruction: `## Step 4: Use or-join across different attributes

\`or-join\` is needed when branches bind different variables. Find customers who have EITHER a placed order OR an order item priced above 1,000 — these two conditions use different intermediate variables (\`?order\` for status, \`?item\` for price), so plain \`or\` cannot be used.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

(query [:find ?customer-name
        :where [?customer :customer/name ?customer-name]
               (or-join [?customer]
                 (and [?order :order/customer ?customer]
                      [?order :order/status :placed])
                 (and [?order :order/customer ?customer]
                      [?item :item/order ?order]
                      [?item :item/price ?price]
                      [(> ?price 1000)]))])`,
      hints: [
        'Branch 1 binds `?order` and checks `:placed`; Branch 2 binds `?order`, `?item`, and `?price` to check the price threshold — different variable sets require `or-join`.',
        'Alice qualifies via both branches (placed order + laptop > 1000); Ben via the price branch only; Clara via the placed branch only.',
      ],
      successMessage: 'You used or-join to combine conditions that bind different intermediate variables.',
    },
  ],
}
```

Update the exported `tutorialMarketplace` to include all five lessons:

```typescript
export const tutorialMarketplace: Tutorial = {
  id: 'marketplace',
  title: 'Corestore Marketplace',
  description: 'Model a multi-seller e-commerce platform with temporal price tracking.',
  goals: 'multi-seller joins, temporal price comparison, aggregates per seller, negation, and disjunction',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1, lesson2, lesson3, lesson4, lesson5],
}
```

- [ ] **Step 4: Verify expected result row order and step 4 open-ended behaviour in browser**

```bash
npm run dev
```

Run steps 1–3 of Lesson 5. Adjust row order in `expectedResult` if needed. Also run step 4 to confirm the `or-join` starter code executes without errors (open-ended steps have no `expectedResult` check).

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: ALL tests PASS — including the two new structural tests (`has exactly 5 lessons`, `step IDs are unique`).

- [ ] **Step 6: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, no build failures.

- [ ] **Step 7: Commit**

```bash
git add lib/lessons/tutorial-marketplace.ts __tests__/lib/lessons.test.ts
git commit -m "feat: add marketplace lessons 5 — disjunction and synthesis; complete tutorial"
```
