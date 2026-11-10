---
ticket_schema: 1
ticket_id: "TDOS-03"
execution_mode: AFK
blocked_by:
  - "TDOS-02"
---

# 03 — Prove inactivity of ownerless bindings

## Artifact Graph
- Artifact ID: `ticket:telegram-dead-owner-slots:03`
- Role: `ticket`
- Parent: [telegram-dead-owner-slots.md](../../specs/telegram-dead-owner-slots.md)

## Parent Spec
[telegram-dead-owner-slots.md](../../specs/telegram-dead-owner-slots.md) — mechanism 2, target
behavior "Ownerless binding", Invariants.

## What to Build
Workspace bindings record their last owner instance whenever a current record with an instance id
activates their target. The dead-owner reconciliation of ticket 02 then stamps the observation time
as `inactiveSinceMs` on every binding with no current record, claim, reservation, pending
provision/cleanup/retirement, no registered follower on its target and no inactivity yet, when its
known owners are all proven dead: the last owner instance, or, without one, a complete non-empty
journal-key set. Bindings with neither stay ineligible.

## Acceptance Criteria
- [ ] Activating a binding's target with a current record stores `lastOwnerInstanceId`; it survives
  persistence and reload and is ignored by normalization when malformed.
- [ ] A binding whose record was dropped by `markStaleByTarget` (non-`deleted`) is stamped once its
  last owner is dead, and not while that owner is alive, unverifiable or registered.
- [ ] A legacy binding without a last owner is stamped only with a complete non-empty dead key set;
  with empty or incomplete keys it stays without inactivity.
- [ ] Re-registration of the owner clears the inactivity as today.
- [ ] `docs/multi-instance-bus.md` and the `threads` entry of `docs/architecture.md` describe the
  last owner instance and the new proof; `CHANGELOG.md` bullet from 02 covers it.
- [ ] Focused suites, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:check` pass.

## Frontier
Dependency-blocked on 02 (reuses its reconciler and triggers).

## Gates
- Attempt: this ticket through the local skills-only handoff.
- Budget, time and maximum attempts: not set.
- Approvals: none needed for local edits and tests; commit, push, merge, version and publication are
  `open` and outside this attempt.
- Exact version: none.
- Existing blocks: none found.

## Step-by-Step Implementation Plan
1. `lib/threads.ts`: optional `lastOwnerInstanceId` on `TelegramWorkspaceThreadBinding`
   (normalize as a bounded string, clone, keep across same-target upserts, clear on target
   replacement); set it from `upsert(record)` for current records with an instance id.
2. `lib/threads.ts`: a store method that stamps proven-ownerless bindings given an owner-liveness
   predicate and a registered-target predicate, reusing the local-protection checks of
   `captureWorkspaceSlotOccupancy`; returns the stamped slots.
3. `lib/bus-leader.ts`: call it at the end of the ticket 02 reconciliation, inside the same
   admission and fencing, then persist.
4. Docs per the spec's Contract updates.

## Testing Plan
Automated: `threads` and `bus-leader` suites; replay of the 2026-11-10 `.bak` snapshot through the
store, reconciliation and allocation plan. No live boundary.

## Out of Scope
- Back-dating inactivity; any time threshold.
- Per-slot diagnostics in `/telegram-status --debug`.
