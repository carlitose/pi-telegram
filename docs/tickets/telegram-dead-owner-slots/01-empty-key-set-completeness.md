---
ticket_schema: 1
ticket_id: "TDOS-01"
execution_mode: AFK
blocked_by: []
---

# 01 — Keep journal completeness for an empty key set

## Artifact Graph
- Artifact ID: `ticket:telegram-dead-owner-slots:01`
- Role: `ticket`
- Parent: [telegram-dead-owner-slots.md](../../specs/telegram-dead-owner-slots.md)

## Parent Spec
[telegram-dead-owner-slots.md](../../specs/telegram-dead-owner-slots.md) — mechanism 3, target
behavior "Completeness".

## What to Build
`upsertWorkspaceBinding` must keep a complete, empty journal-key set as `journalBindingKeys: []`
plus `journalBindingsComplete: true`, so the binding stays complete after persistence and reload.
An incomplete previous binding still never becomes complete.

## Acceptance Criteria
- [ ] A leader binding upserted twice with `journalBindingKeys: []` and complete, then persisted and
  reloaded, is still `journalBindingsComplete: true`.
- [ ] A previous binding without completeness stays incomplete after an upsert that claims it.
- [ ] Merged non-empty key sets behave as before.
- [ ] `tests/threads.test.ts`, `npm run typecheck` and `npm run build:check` pass after `npm run build`.

## Frontier
Ready.

## Gates
- Attempt: this ticket through the local skills-only handoff.
- Budget, time and maximum attempts: not set.
- Approvals: none needed for local edits and tests; commit, push, merge, version and publication are
  `open` and outside this attempt.
- Exact version: none.
- Existing blocks: none found.

## Step-by-Step Implementation Plan
1. In `lib/threads.ts` `upsertWorkspaceBinding`, when a previous binding exists, keep the merged key
   array even when empty if the previous binding was complete; delete it only for an incomplete
   empty set. Checkpoint: reload keeps completeness.
2. Add the regression to `tests/threads.test.ts` (persist, reload, second upsert, reload).
3. `CHANGELOG.md` `Unreleased`: covered by ticket 02's single outcome bullet; no separate entry.

## Testing Plan
Automated: the new store regression plus the existing `threads` suite. No live boundary.

## Out of Scope
- Repairing bindings already persisted without completeness (legacy rule unchanged).
