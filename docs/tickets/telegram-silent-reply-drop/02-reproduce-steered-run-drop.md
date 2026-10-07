---
ticket_schema: 1
ticket_id: "02"
execution_mode: AFK
blocked_by:
  - "01"
---

# Reproduce and fix the steered-run drop

## Artifact Graph
- Artifact ID: `artifact:telegram-silent-reply-drop-02`
- Role: `ticket`
- Parent: [telegram-silent-reply-drop.md](../../specs/telegram-silent-reply-drop.md)

## Parent Spec
[Telegram final replies dropped without a trace](../../specs/telegram-silent-reply-drop.md), target behavior 3 and 4; slice 02.

## What to Build
A lifecycle-level test with real bridge wiring and fake Pi events that replays the observed sequence: a Telegram prompt (from a prompt button) starts a run, one mid-run steer is injected after a tool turn, a second steer is injected at the final `turn_end` so the run continues, then the run settles. The final reply must reach the original turn's target exactly once. If the test reproduces the drop, fix the root cause. If it does not, keep it as a regression, document the exercised paths here, and leave the ticket open for live evidence from ticket 01's events.

## Acceptance Criteria
- [ ] The test covers both steers, including the one queued at the final `turn_end`.
- [ ] With the fix, the final reply is sent once to the original target; no duplicate and no other target.
- [ ] Replaced session, profile or token still blocks delivery and now records ticket 01's event.
- [ ] `npm run typecheck`, `npm test` and `npm run build:check` pass.

## Frontier
Blocked by ticket 01.

## Gates
As the parent spec: one PR to `release/reactive-next-0`, 3 hours per attempt, at most 2 attempts; the agent may merge on green checks; npm publication by the user; installation only after the `dbh-crew` lot.

## Step-by-Step Implementation Plan
1. Locate the lifecycle test harness that drives `agent_start`/`turn_end`/`message_start`/`agent_end` with the mid-run steer runtime.
2. Write the failing test for the observed sequence.
3. Fix the smallest owning module; rebuild `dist/`.

## Testing Plan
Lifecycle/integration test in the mirrored suite; full `npm test`; live check in a paired Thread after installation (manual, not claimed).

## Out of Scope
- Voice fallback and leader/follower protocol changes unless the reproduction proves them causal.
