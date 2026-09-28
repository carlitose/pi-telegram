---
ticket_schema: 1
ticket_id: "01"
execution_mode: AFK
blocked_by: []
---

# Recover stale Thread routing without replay

## Artifact Graph
- Artifact ID: `artifact:telegram-remote-dialogs-01`
- Role: `ticket`
- Parent: [telegram-remote-dialogs.md](../../specs/telegram-remote-dialogs.md)

## Parent Spec
[Telegram remote input and selective waiting notification](../../specs/telegram-remote-dialogs.md), target behavior 1.

## What to Build
Attribute the installed 0.50.1 deleted-Thread failure before changing code. The one recorded stale-target event refers to a different Thread from the currently active binding, and both 0.50.1 and current-head source already test exact-target invalidation. Determine whether subsequent outbound failures belong to an earlier captured turn; repair only a demonstrated gap. Preserve exact target, current authority and no-replay contracts; do not edit live snapshots, journals or locks.

## Acceptance Criteria
- [ ] A proven HTTP 400 deleted-Thread error cannot leave its target routable; current authorized reconciliation restores or provisions a new exact target.
- [ ] Unknown sends and accepted work are neither replayed nor discarded.
- [ ] Cross-profile, stale-generation, unrelated and ambiguous errors cannot invalidate a live binding.
- [ ] If current-head code already passes the regression, record the version difference rather than adding redundant recovery.

## Frontier
Investigated but environment-gated: current-head sync/API/bus regression tests pass, and the only recorded stale-target event has a different Thread ID from the current active binding. A safe disposable live test or equivalent attributable trace is needed before claiming a current routing defect or marking this ticket done.

## Step-by-Step Implementation Plan
1. Trace direct leader, follower and outbound error recovery, and locate any uncovered path.
2. Add a failing regression, implement only a proven correction, and verify no-replay and wrong-target cases.
3. Build the distributive and verify the delivered package graph.

## Testing Plan
Focused sync/bus/threads tests, typecheck, package build; live replacement in a disposable Thread only with a paired environment.

## Out of Scope
- Pi dialogs and notification policy (tickets 02–03); changing the installed package or runtime files.
