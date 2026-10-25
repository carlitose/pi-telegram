# Telegram final replies dropped without a trace

## Artifact Graph
- Artifact ID: `artifact:telegram-silent-reply-drop-spec`
- Role: `spec`
- Standalone: true
### Children
- [01 Record every dropped final reply](../tickets/telegram-silent-reply-drop/01-record-dropped-final-replies.md)
- [02 Reproduce and fix the steered-run drop](../tickets/telegram-silent-reply-drop/02-reproduce-steered-run-drop.md)

## Type and evidence
Bug analysis. On 2026-10-07 a registered follower session (installed `@carlitose86/pi-telegram-reactive` `0.1.0-next.0`, built from `release/reactive-next-0`) produced two final assistant replies that never reached its Telegram Thread. Its session file shows the exact sequence (UTC):

| Time | Event |
| --- | --- |
| 13:39:39 | Telegram prompt (from a prompt button) starts a run |
| 13:39:46 | assistant `toolUse` |
| 13:40:09 | Telegram prompt "Chi sarebbe il collega?" enters the same run |
| 13:40:27 | assistant `stop`, answering both prompts |
| 13:40:27 | Telegram prompt "Poi spiegami…" enters at that last `turn_end`, so the run continues |
| 13:40:32–34 | assistant `toolUse` ×2 |
| 13:40:59 | assistant `stop`; run settles |

Neither reply was delivered, and `tmp/telegram/logs.jsonl` has no event after 13:33:28. Earlier replies of the same session, without mid-run prompts, arrived and left voice-fallback events. Inbound and leader polling stayed healthy.

The final-reply path ends silently in several places:
- `createTelegramAgentEndHook` returns when the session context is no longer current, or when the active turn changed while config loaded.
- `handleTelegramAgentEndRuntime` returns when `isDeliveryActive()` is false (session inactive, or the turn's transport stamp is no longer current) and when there is no active turn at all.
- An assistant text already admitted as an intermediate publication is reduced to its stop reason.

None of these exits records a runtime event, so the logs cannot say which one fired. The transport stamp changes only with profile or bot-token changes, so a stale stamp is unlikely here; a missing active turn or a replaced turn during a run with mid-run steers (`createTelegramMidRunSteerRuntime`, added with the busy-run steering feature) is the leading hypothesis. It is not proven.

## Follow-up evidence (2026-10-22)
The installed 0.1.2 package has a reproducible publication deadlock. `bindings.onMessageEnd`
reserves a FIFO position for the first completed assistant answer. A final-turn steer can
continue that same run without another `agent_start`. Later intermediate output queues
behind the reservation; the next preview inherits its publication promise. Final delivery
then uses the old reservation and waits for a preview boundary behind itself. No request
reaches the transport and no promise rejects, so neither delivery errors nor the ordinary
active-turn/queue counters expose the wait.
A synthetic offline reproduction using the installed publication, preview and agent-end
modules confirms the cycle; its control sends the final reply. The live report is consistent
with that mechanism, but the live process's pending promises were not inspected.
The repair releases a provisional final reservation when another assistant message starts,
before that message can queue progress or inherit preview publication dependencies. The
actual final answer reserves its current position as before. No timeout, replay or transport
bypass is introduced; target/session fences and cross-run ordering remain unchanged.

### Windows CI delivery blocker
Exact-head run `39806230845`, attempts 1 and 2, fails native connect/resume because a
`state.json` atomic rename throws `EPERM`; the assistant-publication hook is not exercised.
The existing sharing-retry helper already handles this class of bounded filesystem
contention elsewhere. Slice 02 also applies its unchanged retry policy at the thread snapshot
commit boundary: synchronous inside ownership fences, asynchronous on the unfenced path
so pending filesystem reads can close. A synchronous-only draft failed the native test and
is retained as failed evidence, not treated as successful verification.
Injected transient sharing failures must recover; exhausted retries, missing temporary
files and non-sharing errors must still fail without publishing an invalidation or changing
the previous durable snapshot. Keep the existing synchronous ownership fence and format.

## Goal
A final reply produced for a Telegram turn reaches its exact Telegram target, and when the bridge deliberately does not deliver one it leaves a redacted diagnostic event naming the reason.

## Non-goals
- No change to voice fallback, prompt buttons or the leader/follower bus protocol unless the reproduction proves they cause the drop.
- No replay of an uncertain send and no delivery to a different target, profile or session.
- No mutation of journals, owners, locks or state files to recover lost replies.

## Target behavior and invariants
1. Every non-delivery exit of the final-reply path that discards assistant text, attachments or an error notice records one `delivery` runtime event with a stable `phase` per reason: `final-reply-session-inactive`, `final-reply-transport-inactive` or `final-reply-turn-replaced`. Event details hold only bounded, redacted facts: reason, turn and Thread presence, text length, attachment count; never the reply text.
2. Exits that discard nothing (no text, no attachments, no error) stay silent. A run with no active Telegram turn is an ordinary local run whose output belongs to companion projection, and an answer already admitted as an intermediate publication is intentional deduplication; neither records an event, so routine runs do not flood the log. Slice 02 decides whether the observed drop went through the no-active-turn exit.
3. A run started by a Telegram prompt that absorbs one or more mid-run Telegram steers, including a steer queued at the final `turn_end`, delivers its final reply to the original turn's target exactly once.
4. Existing fences keep their meaning: a truly replaced session, profile or bot token still prevents delivery, now with an event.

## Implementation slices
- **01:** Add the diagnostic events of invariants 1–2 with unit tests for each reason. This alone makes any recurrence attributable.
- **02:** Reproduce the observed sequence (prompt-button turn, mid-run steer after a tool turn, second steer at the final `turn_end`) in a lifecycle-level test with real bridge wiring and fake Pi events. If it reproduces, fix the root cause and keep the test. If it does not, record which paths were exercised, keep the test as a regression, and leave the ticket open for live evidence from slice 01's events.

## Verification
Unit tests for each event reason; a lifecycle/integration test for invariant 3; `npm run build`, `npm run typecheck`, `npm test`, `npm run build:check`. Live confirmation needs a paired Telegram Thread and is a manual step after installation; no live behavior is claimed from tests.

## Gates
- **Attempt:** current repair pass through handoff, following the 2026-10-07 pass that did not reproduce the failure (PR #9). Target: `release/reactive-next-0`.
- **Budget and time per attempt:** retain the existing 3-hour limit and no external spend. **Maximum attempts:** retain 2; this is the second repair pass, not a reset of earlier evidence.
- **Approvals:** implementation and targeted checks approved by the user's “si” on 2026-10-22; the later “si per favore, aggiorna quello che c'e locale winbox e mac” approves commit, PR, CI and updating the package on those three hosts. The subsequent affirmative “certi” approves merge and npm publication after green CI; runtime reload is not approved. No live session is changed by implementation or CI.
- **Exact version:** none; reproduction uses installed 0.1.2, implementation starts from `8d745f14edddb72437d2540d03215e5b20dbb809`.
- **Existing blocks found:** no implementation-start block. The repository requires typecheck, generated `dist`, and full tests at its stable gate; the operator forbids heavy full local suites, so full cross-platform validation is deferred to exact-head CI, not waived. The earlier benchmark installation restriction is historical; the newly approved host updates remain deferred until the delivery gates complete. Searched: `AGENTS.md`, `BACKLOG.md`, package scripts and `validate.yml`.
- **Historical authority:** the October 7 gate allowed one PR merge and publication of `0.1.0-next.1` by the user; it is not treated as a fresh grant to publish or install this repair.
