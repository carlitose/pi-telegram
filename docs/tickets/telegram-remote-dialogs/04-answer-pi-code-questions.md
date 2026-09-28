---
ticket_schema: 1
ticket_id: "04"
execution_mode: AFK
blocked_by: []
---

# Answer `pi-code.question` through the assigned Telegram Thread

## Artifact Graph
- Artifact ID: `artifact:telegram-remote-dialogs-04`
- Role: ticket
- Parent: [telegram-remote-dialogs.md](../../specs/telegram-remote-dialogs.md)

## Parent Spec
[Telegram remote input and selective waiting notification](../../specs/telegram-remote-dialogs.md), target behavior 3–6 and implementation slice 04. The producer contract is owned by `pi-code/docs/specs/telegram-question-responder.md` in the `ilovepixelart/pi-code` repository.

## What to Build
Listen to the versioned `pi-code.question` offer on the public in-process Pi event bus. Claim synchronously only for the current session and its authorized live target, then present the question as a numbered reply-to-message prompt. Accept one index, comma-separated indices for multi-select (or `none`), `/text <answer>` for single-select free text (including numeric text), and `/cancel`; a non-numeric single-select reply is free text. Call the producer's `touch()` for exact-target reply activity while the question is pending. Settle the exact request once; reuse the bridge's target/owner/no-replay and selective alert policies. Leave unrelated `ctx.ui.custom()` components local.

## Acceptance Criteria
- [ ] An eligible paired owner can select one or several indexed choices, enter allowed free text, or cancel from the assigned Telegram Thread; `pi-code.question` returns its existing typed result in the same Pi session.
- [ ] Wrong user, profile, Thread, stale target, duplicate/late reply, local abort and session replacement cannot settle a pending remote question. No ordinary Telegram prompt is silently consumed as an answer.
- [ ] No listener claim or confirmed transport failure opens the local Pi overlay; an uncertain send is not replayed and any late Telegram reply is inert. A synchronous claim is provisional: the bridge never advertises answerability until the exact-target send is confirmed, and known failure settles `pass`.
- [ ] One non-silent alert is attempted per newly answerable question, not for invalid replies or busy/polling updates; exact-target reply activity resets a configured idle timer, routine mute remains opt-in, and device sound is not promised.
- [ ] Unit, classic/leader/follower integration, producer/consumer package composition and the bridge's mandatory checks pass on exact candidate identities. A disposable live Thread demonstrates one answer and local fallback before acceptance.

## Frontier
Implementation-ready against the producer's unchanged `pi-code:question:v1` contract at `6f163fd20e33d447b7d8dcbe60573480c3fce5cb`, while acceptance and activation remain blocked by local ticket 01's healthy target evidence and producer review/CI. The producer is in [fork draft PR #2](https://github.com/carlitose/pi-code/pull/2) and [upstream draft PR #293](https://github.com/ilovepixelart/pi-code/pull/293); its local full profile passed with a Windows temp root outside the real home, but neither PR has exact-head passing Actions or a merge. No Pi host `ui_prompt_request` patch is required for this question-specific event. Host-dependent select/confirm/input/editor ticket 03 remains blocked on ticket 02. Prior Thread F `1,3` updates replied to the topic-creation service message and were queued as ordinary prompts; the question result was answered in the terminal. This is not remote settlement, and uncertain sends or expired questions must not be retried.

## Step-by-Step Implementation Plan
1. Pin the producer contract and add failing tests for current-session claim, indexed multi-select/free text, cancel and exact-target rejection.
2. Add the versioned event listener and pending-question adapter at the existing bridge routing boundary, with one alert and bounded settlement/fallback.
3. Build `dist`, run causal and mandatory checks, then verify the installed producer/consumer pair and a user-observed disposable live answer without duplicating uncertain effects.

## Testing Plan
Stub Bot API sends and owner replies in unit tests; real Pi event-bus composition in integration tests; classic/leader/follower target tests; typecheck, build, package and audit checks. A separate controlled live test must confirm delivery and a settled `question` result in the original Pi session.

## Out of Scope
- Generic custom TUI components, a parallel Telegram poller, changes to host ticket 02, bypassing provider review, and unrelated `pi-code` dependency warnings.
