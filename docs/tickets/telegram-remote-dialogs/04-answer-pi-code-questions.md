---
ticket_schema: 1
ticket_id: "04"
execution_mode: AFK
blocked_by:
  - "01"
---

# Answer `pi-code.question` through the assigned Telegram Thread

## Artifact Graph
- Artifact ID: `artifact:telegram-remote-dialogs-04`
- Role: ticket
- Parent: [telegram-remote-dialogs.md](../../specs/telegram-remote-dialogs.md)

## Parent Spec
[Telegram remote input and selective waiting notification](../../specs/telegram-remote-dialogs.md), target behavior 3–6 and implementation slice 04. The producer contract is owned by `pi-code/docs/specs/telegram-question-responder.md` in the `ilovepixelart/pi-code` repository.

## What to Build
Listen to the versioned `pi-code.question` offer on the public in-process Pi event bus. Claim only for the current session and its authorized live target, present single-/multi-select and single-select free-text choices, and settle the exact request once. Report checkbox activity through the producer's `touch()` method so a configured idle timeout is reset while the owner interacts. Reuse the bridge's target/owner/no-replay and selective alert policies. Leave unrelated `ctx.ui.custom()` components local.

## Acceptance Criteria
- [ ] An eligible paired owner can select one or several indexed choices, enter allowed free text, or cancel from the assigned Telegram Thread; `pi-code.question` returns its existing typed result in the same Pi session.
- [ ] Wrong user, profile, Thread, stale target, duplicate/late reply, local abort and session replacement cannot settle a pending remote question. No ordinary Telegram prompt is silently consumed as an answer.
- [ ] No listener claim or confirmed transport failure opens the local Pi overlay; an uncertain send is not replayed and any late Telegram reply is inert. The tool does not claim a remotely answerable question without confirmed exact-target delivery.
- [ ] One non-silent alert is attempted for each newly answerable question, not every checkbox toggle or busy/polling update; checkbox activity resets the configured idle timer, routine mute remains opt-in, and device sound is not promised.
- [ ] Unit, classic/leader/follower integration, producer/consumer package composition and the bridge's mandatory checks pass on exact candidate identities. A disposable live Thread demonstrates one answer and local fallback before acceptance.

## Frontier
Dependency-blocked by local ticket 01's healthy target evidence and by an accepted `pi-code.question` producer contract. The producer is proposed in [pi-code draft PR #293](https://github.com/ilovepixelart/pi-code/pull/293) at `0e03520892ae50bd4849719dc94c843b9032467c`; focused checks pass, but its required PR CI needs maintainer approval to run and it is not merged or released. No Pi host `ui_prompt_request` patch is required for this question-specific event. The existing host-dependent select/confirm/input/editor ticket 03 remains separate and blocked on ticket 02. An E Thread text probe was observed, but multi-choice delivery/settlement was not; a cross-Thread agent-turn routing failure after send must not be retried.

## Step-by-Step Implementation Plan
1. Pin the producer contract and add failing tests for current-session claim, indexed multi-select/free text, cancel and exact-target rejection.
2. Add the versioned event listener and pending-question adapter at the existing bridge routing boundary, with one alert and bounded settlement/fallback.
3. Build `dist`, run causal and mandatory checks, then verify the installed producer/consumer pair and a user-observed disposable live answer without duplicating uncertain effects.

## Testing Plan
Stub Bot API sends and owner replies in unit tests; real Pi event-bus composition in integration tests; classic/leader/follower target tests; typecheck, build, package and audit checks. A separate controlled live test must confirm delivery and a settled `question` result in the original Pi session.

## Out of Scope
- Generic custom TUI components, a parallel Telegram poller, changes to host ticket 02, bypassing provider review, and unrelated `pi-code` dependency warnings.
