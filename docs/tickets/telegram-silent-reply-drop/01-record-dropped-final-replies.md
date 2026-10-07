---
ticket_schema: 1
ticket_id: "01"
execution_mode: AFK
blocked_by: []
---

# Record every dropped final reply

## Artifact Graph
- Artifact ID: `artifact:telegram-silent-reply-drop-01`
- Role: `ticket`
- Parent: [telegram-silent-reply-drop.md](../../specs/telegram-silent-reply-drop.md)

## Parent Spec
[Telegram final replies dropped without a trace](../../specs/telegram-silent-reply-drop.md), target behavior 1, 2 and 4; slice 01.

## What to Build
Make each non-delivery exit of the final-reply path (`createTelegramAgentEndHook` and `handleTelegramAgentEndRuntime` in `lib/queue.ts`) that discards assistant text, queued attachments or an error notice record one redacted `delivery` runtime event with a stable `final-reply-*` phase naming the reason. Exits that discard nothing stay silent. Delivery behavior and fences do not change.

## Acceptance Criteria
- [ ] Session-inactive, transport-inactive, turn-replaced, no-active-turn and already-published exits each record exactly one event with their own phase when content would be lost.
- [ ] Event details contain no reply text; only reason, text presence/length, attachment count and target presence.
- [ ] A run with nothing to publish records no event.
- [ ] Existing queue/lifecycle tests stay green; `dist/` is rebuilt.

## Frontier
Done: merged in #8 (`298f291`), CI green on Linux, macOS and Windows. Live events appear only after the package is published and installed.

## Gates
As the parent spec: one PR to `release/reactive-next-0`, 3 hours per attempt, at most 2 attempts; the agent may merge on green checks; npm publication by the user; installation only after the `dbh-crew` lot.

## Step-by-Step Implementation Plan
1. Add a failing unit test per reason in `tests/queue.test.ts`.
2. Record the events at each exit through the existing `recordRuntimeEvent` port.
3. `npm run build`, typecheck, focused then full tests.

## Testing Plan
Unit tests in `tests/queue.test.ts`; `npm run typecheck`; `npm test`; `npm run build:check`.

## Out of Scope
- Finding or fixing the root cause (ticket 02).
