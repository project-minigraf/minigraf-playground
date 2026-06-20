# Design: Datalog Reference in AI Tutor System Prompt

**Date:** 2026-06-20
**Status:** Approved
**Related issue:** AI tutor system prompt needs a copy of the Datalog reference

---

## Problem

`lib/system-prompt.ts` contains a hand-written, condensed Datalog reference (~130 lines) in `STABLE_PREFIX`. This summary:

- Omits the **semantic constraints** section entirely (not-safety rules, expression variable binding order, `or` branch symmetry) — the errors most likely to confuse students
- Lacks detail on `not-join` vs `not` contrast and stratification
- Is missing `:max-derived-facts` / `:max-results` query options
- Has thinner coverage of aggregation type rules and empty-result semantics
- Has thinner coverage of window function compatibility rules

The authoritative reference is the [Minigraf Datalog wiki page](https://github.com/project-minigraf/minigraf/wiki/Datalog-Reference).

---

## Decision

Replace the hand-written reference section in `STABLE_PREFIX` with a curated static copy drawn from the wiki, filtered to what is relevant in the browser playground context.

**Single file changed:** `lib/system-prompt.ts`

The `buildSystemPrompt` function signature and the **Teaching Policy** section are untouched.

---

## Content Plan

### Included (expanded from wiki)

| Section | Change |
|---|---|
| Commands overview | Minor wording update |
| Facts | Add value-types table, 5-element valid-time form |
| Transact | Add per-fact valid-time override example |
| Retract | Clarify history-preservation semantics |
| Query | Add variable unification note, where-clause positions |
| Bi-temporal queries | Add `:max-derived-facts` / `:max-results` options |
| Negation | Expand `not-join` contrast with `not`; add stratification rules and cycle-rejection note |
| Disjunction | Add branch-contents note, `or` safety (branch variable symmetry), `or-join` safety |
| Aggregation | Add type rules (sum/min/max), empty-result semantics table |
| Window functions | Add full compatibility table, type rules, mixed aggregate+window note |
| Arithmetic & predicates | Add operators table, semantics (type mismatch, division by zero, `is_truthy`) |
| Recursive rules | No change (already accurate) |
| **Semantic constraints** | **New section** — not-safety, `not-join` join-var safety, nested-not prohibition, expression forward-binding, aggregate/`:with` binding, `or` branch symmetry |
| UDFs (query syntax only) | Keep existing; no Rust registration code |
| Constraints & limits | Sync with wiki (add in-memory note, timestamp date-only form) |

### Excluded

| Section | Reason |
|---|---|
| Formal EBNF grammar | Not useful for teaching; LLMs reason better from examples |
| Prepared statements | Rust API — not accessible from the browser playground |
| Explicit transactions | Rust API — not accessible from the browser playground |
| REPL commands | Not applicable to browser context |
| UDF Rust registration code | Rust API — only query-syntax usage is relevant |

---

## Implementation

### File: `lib/system-prompt.ts`

Replace `STABLE_PREFIX` with the expanded content following the section order above. Preserve the Teaching Policy section verbatim at the end of `STABLE_PREFIX`.

The string remains a plain template literal — no imports, no build step, no runtime fetch.

Approximate size: ~280–320 lines (up from ~150).

### No other files change

`buildSystemPrompt`, the chat route, hooks, and tests are all unaffected.

---

## Testing

- `npm test` — existing tests must remain green (no logic changes)
- `npm run build` — must succeed
- Manual smoke test: open the playground, send a query to the tutor, confirm the response references the updated reference content (e.g., ask about `not-join` safety or `:max-derived-facts`)

---

## Out of Scope

- Dynamic wiki fetching at build or runtime
- Splitting the reference into a separate file
- Changing `buildSystemPrompt` or the chat route
