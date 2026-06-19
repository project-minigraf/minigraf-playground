# Marketplace Tutorial Design

**Issue:** #28  
**Date:** 2026-06-19  
**Status:** Approved

---

## Overview

Fills in `lib/lessons/tutorial-marketplace.ts` (stub added in commit `b0bba7d`) with 5 lessons covering the Datalog concepts unique to a multi-seller e-commerce scenario. The tutorial runs in its own isolated WASM/IDB instance (per the multi-tutorial architecture from PR #33). Each step is self-contained: its `starterCode` re-asserts all data it needs.

---

## Dataset

All 5 lessons share one canonical Corestore Marketplace dataset. Each step's `starterCode` opens with the full dataset assertion before the concept-specific code.

### Entities

**Sellers**

| Entity | `:seller/name` | `:seller/sla-days` |
|---|---|---|
| `:corestore-direct` | `"Corestore Direct"` | `3` |
| `:techsource` | `"TechSource"` | `7` |
| `:gadgethaus` | `"GadgetHaus"` | `5` |

**Products**

| Entity | `:product/name` |
|---|---|
| `:laptop-pro` | `"LaptopPro 15"` |
| `:phone-x` | `"PhoneX 12"` |
| `:nc-headphones` | `"NoiseCancel Pro"` |
| `:usb-cable` | `"USB-C Cable"` |
| `:keyboard-k1` | `"Compact Keyboard"` |

**Seller listings** (bridge entity carrying per-seller pricing)

| Entity | `:listing/seller` | `:listing/product` | `:listing/price` |
|---|---|---|---|
| `:listing-cd-laptop` | `:corestore-direct` | `:laptop-pro` | `1299` |
| `:listing-ts-laptop` | `:techsource` | `:laptop-pro` | `1249` |
| `:listing-cd-phone` | `:corestore-direct` | `:phone-x` | `799` |
| `:listing-gh-phone` | `:gadgethaus` | `:phone-x` | `819` |
| `:listing-cd-nc` | `:corestore-direct` | `:nc-headphones` | `249` |
| `:listing-ts-nc` | `:techsource` | `:nc-headphones` | `229` |
| `:listing-cd-usb` | `:corestore-direct` | `:usb-cable` | `19` |
| `:listing-ts-keyboard` | `:techsource` | `:keyboard-k1` | `89` |

Notes:
- `:usb-cable` is listed only by Corestore Direct (drives Lesson 4 negation).
- `:keyboard-k1` is listed only by TechSource (drives Lesson 4 negation).
- `:phone-x` is listed only by Corestore Direct and GadgetHaus (not TechSource).

**Customers**

| Entity | `:customer/name` |
|---|---|
| `:alice` | `"Alice"` |
| `:ben` | `"Ben"` |
| `:clara` | `"Clara"` |

**Orders**

| Entity | `:order/customer` | `:order/seller` | `:order/status` |
|---|---|---|---|
| `:order-a1` | `:alice` | `:corestore-direct` | `:delivered` |
| `:order-b1` | `:ben` | `:techsource` | `:delivered` |
| `:order-c1` | `:clara` | `:gadgethaus` | `:placed` |
| `:order-a2` | `:alice` | `:corestore-direct` | `:placed` |

**Order items**

| Entity | `:item/order` | `:item/product` | `:item/price` |
|---|---|---|---|
| `:order-a1-i1` | `:order-a1` | `:laptop-pro` | `1299` |
| `:order-b1-i1` | `:order-b1` | `:laptop-pro` | `1249` |
| `:order-b1-i2` | `:order-b1` | `:nc-headphones` | `229` |
| `:order-c1-i1` | `:order-c1` | `:phone-x` | `819` |
| `:order-a2-i1` | `:order-a2` | `:usb-cable` | `19` |

**Revenue check** (used to verify Lesson 3 aggregate expected results):
- Corestore Direct: 1299 + 19 = **1318**
- TechSource: 1249 + 229 = **1478**
- GadgetHaus: 819

### Temporal price history (Lesson 2 only)

Lesson 2 steps use a modified version of the base dataset. The permanent `:listing/price` fact for `:listing-ts-laptop` is **omitted** — replacing it with two valid-time transactions that carry the full price history:

```
(transact {:valid-from "2025-01-01" :valid-to "2025-12-31"}
  [[:listing-ts-laptop :listing/price 1299]])

(transact {:valid-from "2026-01-01"}
  [[:listing-ts-laptop :listing/price 1249]])
```

This avoids duplicate rows: a plain query or any `:valid-at` snapshot will see exactly one price for TechSource laptop. All other listings use no valid-time bounds (permanently valid). All historical price queries use `:valid-at` exclusively; `:as-of` is not used in this tutorial.

---

## Lessons

### Lesson 1 — Multi-seller joins

**id:** `marketplace-1`  
**title:** Multi-seller joins  
**description:** Query across sellers, products, and orders using multi-hop joins and expression clause filters.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `m1-s1` | Basic 3-hop join: order → customer/name, order → seller → seller/name | 4 rows: Alice×Corestore Direct×`:delivered`, Alice×Corestore Direct×`:placed`, Ben×TechSource×`:delivered`, Clara×GadgetHaus×`:placed` |
| 2 | `m1-s2` | Filter by seller keyword: `[?order :order/seller :techsource]` before name joins | 1 row: Ben×TechSource×`:delivered` |
| 3 | `m1-s3` | Cross-seller price comparison via listing entity; expression clause `[(< ?price 1260)]` to isolate cheaper options | All 8 listings, then filtered to TechSource laptop 1249, TechSource nc-headphones 229, Corestore usb-cable 19, TechSource keyboard 89 |
| 4 | `m1-s4` | Open-ended: list sellers with their SLA, extend to filter for fast sellers (SLA < 6) | No expected result; tutor gives feedback |

---

### Lesson 2 — Temporal queries across sellers

**id:** `marketplace-2`  
**title:** Temporal queries across sellers  
**description:** Use valid-time snapshots to inspect historical seller pricing and identify which seller was cheapest on a given date.

All historical price queries use `:valid-at`. `:as-of` is not introduced in this lesson.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `m2-s1` | Assert base dataset + temporal price history for TechSource laptop; plain query (no `:valid-at`) shows both the permanent listing price and the temporal prices | Learner observes that TechSource laptop appears with both historical prices alongside permanent listings from other sellers |
| 2 | `m2-s2` | `:valid-at "2025-06-01"` — snapshot at old price; TechSource laptop resolves to 1299 | Corestore Direct / LaptopPro 15 / 1299, TechSource / LaptopPro 15 / 1299 (tie) |
| 3 | `m2-s3` | `:valid-at "2026-06-01"` — query all sellers' laptop prices on that date; add `[(< ?price 1260)]` to isolate the now-cheaper option | Without filter: Corestore Direct 1299, TechSource 1249. With filter: TechSource 1249 only. |
| 4 | `m2-s4` | Open-ended: assert own price change for any product with valid-time ranges; write queries at two dates to show the change | No expected result; tutor gives feedback |

---

### Lesson 3 — Aggregates per seller

**id:** `marketplace-3`  
**title:** Aggregates per seller  
**description:** Use count, sum, and max to compute order totals and revenue figures grouped by seller.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `m3-s1` | `(count ?order)` grouped by `?seller-name`; join order → seller → seller/name | Corestore Direct 2, GadgetHaus 1, TechSource 1 |
| 2 | `m3-s2` | `(sum ?price)` grouped by seller; join order → item → item/price; `:with ?item` to prevent false row merging | Corestore Direct 1318, GadgetHaus 819, TechSource 1478 |
| 3 | `m3-s3` | `(max ?price)` grouped by seller; same join path as Step 2; surfaces highest single-item price per seller | Corestore Direct 1299, GadgetHaus 819, TechSource 1249 |
| 4 | `m3-s4` | Open-ended: `(count-distinct ?customer)` per seller; extend to filter sellers above a customer-count threshold with an expression clause | No expected result; tutor gives feedback |

---

### Lesson 4 — Negation across sellers

**id:** `marketplace-4`  
**title:** Negation across sellers  
**description:** Use `not` and `not-join` to find products, sellers, and customers defined by the absence of a relationship.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `m4-s1` | `not-join [?product]`: products with no listing entity linking them to `:techsource` | PhoneX 12, USB-C Cable |
| 2 | `m4-s2` | `not`: sellers that have no order with `:order/status :delivered`; all variables bound before the `not` clause | GadgetHaus |
| 3 | `m4-s3` | Chained `not-join`: products listed by Corestore Direct where no GadgetHaus listing also exists for that product | LaptopPro 15, NoiseCancel Pro, USB-C Cable |
| 4 | `m4-s4` | Open-ended: find customers who have no placed orders (all fulfilled or none placed) | No expected result; tutor gives feedback |

---

### Lesson 5 — Disjunction and synthesis

**id:** `marketplace-5`  
**title:** Disjunction and synthesis  
**description:** Use `or` and `or-join` to match across seller alternatives, then combine with negation in a single synthesis query.

| Step | id | Concept | Expected result |
|---|---|---|---|
| 1 | `m5-s1` | `or` on `:order/seller`: orders from `:corestore-direct` OR `:gadgethaus`; join to customer name and seller name | Alice×Corestore Direct×`:delivered`, Alice×Corestore Direct×`:placed`, Clara×GadgetHaus×`:placed` |
| 2 | `m5-s2` | Rule using `or` in rule body: `marketplace-seller` matches `:techsource` or `:gadgethaus`; query orders through that rule | Ben×TechSource, Clara×GadgetHaus |
| 3 | `m5-s3` | Combined negation + disjunction: `or` on `:order/seller` (Corestore OR GadgetHaus) and `not` on `:order/status :delivered` in the same `:where`; surfaces pending orders on non-TechSource side | Alice×Corestore Direct (order-a2, `:placed`), Clara×GadgetHaus (order-c1, `:placed`) |
| 4 | `m5-s4` | Open-ended: `or-join` to find customers who have either a placed order OR an order item priced above 1000 (branches bind different variables, making `or-join` necessary over plain `or`) | No expected result; tutor gives feedback |

---

## Implementation

**File to modify:** `lib/lessons/tutorial-marketplace.ts`

The stub currently has `lessons: []`. Replace with an array of 5 `Lesson` objects following the same structure as `lib/lessons/lesson-1.ts` through `lesson-4.ts`:
- Each lesson: `id`, `title`, `description`, `steps: LessonStep[]`
- Each step: `id`, `instruction` (markdown), `starterCode`, `expectedResult` (omit on open-ended steps), `hints` (2 entries), `successMessage`

No new files, types, or dependencies are required. The `Tutorial` type already supports the structure.

**Tests:** Add to `__tests__/lib/lessons.test.ts` — verify that `tutorialMarketplace.lessons` has length 5, each lesson has the correct `id`, and each non-open-ended step has a non-empty `expectedResult`.
