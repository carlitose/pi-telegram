---
ticket_schema: 1
ticket_id: "TDOS-02"
execution_mode: AFK
blocked_by:
  - "TDOS-01"
---

# 02 — Detach persisted owners whose process is gone

## Artifact Graph
- Artifact ID: `ticket:telegram-dead-owner-slots:02`
- Role: `ticket`
- Parent: [telegram-dead-owner-slots.md](../../specs/telegram-dead-owner-slots.md)

## Parent Spec
[telegram-dead-owner-slots.md](../../specs/telegram-dead-owner-slots.md) — mechanism 1, target
behavior "Dead persisted owner" and "Triggers", Decisions, Invariants.

## What to Build
The leader reconciles persisted current Thread records whose exact owner PID is absent: once after
its polling starts, and before pressure rotation when an allocation fails with
`TelegramWorkspaceSlotUnavailableError`. A dead owner with exactly one matching binding goes through
the fenced `detachTargetOwner` (stamps `inactiveSinceMs`, keeps the Thread); a dead owner without a
binding is released so its slot stops reserving capacity. Nothing calls Telegram.

## Acceptance Criteria
- [ ] Owner liveness covers leader ids (`PID:createdAtMs`) and follower ids
  (`PID:generation:…`, `PID:start:…`): absent PID is `dead`, anything else is not.
- [ ] After a new leader starts, a dead leader record and a dead follower record are detached and
  their bindings carry `inactiveSinceMs`; no Telegram API call is made.
- [ ] Records of this runtime, of registered followers, and of alive or unverifiable owners are
  untouched.
- [ ] With `A`–`Z` held only by such dead owners, one fresh allocation retires the oldest binding
  through the existing rotation and gets its letter.
- [ ] A lost leader epoch or a profile change ends reconciliation without store effects.
- [ ] `AGENTS.md` §4.3, `docs/multi-instance-bus.md` and `CHANGELOG.md` `Unreleased` describe the
  new non-destructive detachment source.
- [ ] Focused suites, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:check` pass.

## Frontier
Dependency-blocked on 01 (leader bindings must stay complete to become eligible).

## Gates
- Attempt: this ticket through the local skills-only handoff.
- Budget, time and maximum attempts: not set.
- Approvals: none needed for local edits and tests; commit, push, merge, version and publication are
  `open` and outside this attempt.
- Exact version: none.
- Existing blocks: none found.

## Step-by-Step Implementation Plan
1. `lib/bus.ts`: add an owner-instance liveness helper that delegates birth-identity ids to
   `getTelegramProcessBirthIdentityLiveness` and checks the PID of `PID:createdAtMs` ids
   (absent → `dead`, present → `unverifiable`). Unit tests in `tests/bus.test.ts`.
2. `lib/bus-leader.ts`: a dead-persisted-owner reconciler in the leader assembly. Under
   `runWorkspaceOperation` (profile scope, kind `workspace.reconcile-dead-owners`) it captures
   leader epoch and profile, loads the store, selects current records not owned by this instance
   nor by a registered follower (instance or target), detaches dead owners with
   `detachTargetOwner(record, isCurrent)` or releases binding-less ones, persists, and records one
   runtime event per detachment. Checkpoint: unit test with a fake registry and store.
3. Run it once after a successful leader `startPolling`, detached and fenced, failures recorded as
   events; never block startup.
4. `lib/workspace-retirement.ts`: add an optional `reconcileDeadOwners` port to the slot-rotation
   runner, called in the slot-unavailable branch before `rotate()`, next to the dead-owner queue
   reclaim; wire it from the leader assembly.
5. Docs and changelog per the spec's Contract updates.

## Testing Plan
Automated: `bus`, `bus-leader`, `workspace-retirement`, `threads` suites and an integration case for
"dead leader and follower, new leader, full pressure, one rotation". Manual (not run here): on
Windows close a follower window with no leader running, start a leader, check the binding's
`inactiveSinceMs` in `state.json`.

## Out of Scope
- Deleting Threads during reconciliation, whatever the cleanup setting.
- Ownerless bindings without a record (ticket 03).
