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

## Evidence
Attributable trace on the installed `@carlitose86/pi-telegram-reactive` 0.1.0 (`ccca9f8`), read-only from the local `tmp/telegram` logs and state:
- 2026-10-11 17:14:32 (UTC+2): one `topic-target-stale` event for chat `116214222`, Thread `149558` (slot `R`, the local session's bound Thread "Reef"); `syncObservations` records `syncStatus: "deleted"`, `lastReconcileAction: "mark-stale"`.
- From that moment until 2026-10-12 15:40: 274 more `HTTP 400 message thread not found` failures (`sendMessage`, `sendRichMessage`; categories `api`, `activity`, `proactive-push`, `local-prompt-echo`). No new Thread was provisioned, and the session's binding still pointed at `149558` when it was inspected on 2026-10-12.
- The failures stopped only after the owner ran `/telegram-disconnect` + `/telegram-connect`, which bound a new Thread.
- Limit: the failure lines carry only `method`/`activityId`, not the target. The link to `149558` comes from the single stale mark, the time window and the inspected binding. A target field on outbound failure events would make the next trace exact.

## Frontier
Unblocked by the evidence above: the stale mark and the active binding are the same Thread, yet the target stayed routable and nothing was reprovisioned. Next: reproduce offline (mark-stale on the bound target, then the next outbound send and reconciliation) and repair the proven gap.

## Step-by-Step Implementation Plan
1. Trace direct leader, follower and outbound error recovery, and locate any uncovered path.
2. Add a failing regression, implement only a proven correction, and verify no-replay and wrong-target cases.
3. Build the distributive and verify the delivered package graph.

## Testing Plan
Focused sync/bus/threads tests, typecheck, package build; live replacement in a disposable Thread only with a paired environment.

## Out of Scope
- Pi dialogs and notification policy (tickets 02–03); changing the installed package or runtime files.
