---
ticket_schema: 1
ticket_id: "02"
execution_mode: HITL
blocked_by:
  - "01"
---

# Reproduce and fix the steered-run drop

## Artifact Graph
- Artifact ID: `artifact:telegram-silent-reply-drop-02`
- Role: `ticket`
- Parent: [telegram-silent-reply-drop.md](../../specs/telegram-silent-reply-drop.md)

## Parent Spec
[Telegram final replies dropped without a trace](../../specs/telegram-silent-reply-drop.md), target behavior 3–4 and the October 22 follow-up evidence.

## What to Build
Release the provisional final-publication reservation when the same agent run starts another
assistant message after a final-turn steer. Extend the existing real extension integration
regression with streamed intermediate output after that first completed answer. The final
reply must reach the original target once, without a circular preview/publication wait.
The mandatory Windows CI twice exposed an existing transient snapshot-rename failure during
native connect/resume. Unblock delivery by reusing the existing bounded sharing retry helper
for thread snapshots, without changing its policy, ownership fences or state format.

## Acceptance Criteria
- [ ] The lifecycle regression covers 0/1/2 steers and streamed intermediate output after the final-turn steer; it fails before the repair.
- [ ] After the repair, progress and the final answer are sent in order to the original target, once each, without hanging.
- [ ] A new assistant message releases the superseded reservation; user/tool messages do not release it prematurely.
- [ ] Replaced session/profile/transport and error/abort delivery retain their existing fences and behavior.
- [ ] Typecheck, causal regressions, build and build:check pass; the required full test profile remains explicit until exact-head CI runs it.
- [ ] Thread snapshots recover from transient sharing errors with the existing bounded retries; permanent/exhausted errors retain the previous snapshot and do not publish an invalidation.

## Frontier
The publication repair passed its original 24 targeted checks. Exact-head CI attempts 1 and 2 failed the Windows native connect/resume fixture on snapshot EPERM. A bounded sharing-retry repair is under causal validation; full new exact-head CI and host installation remain pending. The 2026-10-07 investigation (PR #9) did not reproduce the defect and
left this ticket open. An October 22 offline reproduction proves the publication/preview
cycle in 0.1.2; the previous integration regression omitted the streamed intermediate output
that creates the dependency. Ticket 01's diagnostics are integrated in ancestor `298f291`.
Live incident attribution remains medium confidence: no inspection or mutation of the
running session is authorized.

## Gates
- Attempt: second repair pass through handoff on `release/reactive-next-0`; retain the first investigation's evidence.
- Budget/time per attempt: existing 3-hour limit, no external spend; maximum 2 attempts.
- Approvals: user's “si” (2026-10-22) approves implementation; the later “si per favore, aggiorna quello che c'e locale winbox e mac” approves commit, PR, CI and package updates on those hosts. The subsequent affirmative “certi” approves merge and npm publication after green CI; runtime reload is not approved. These are not implementation-start gates.
- Exact version: none; base `8d745f14edddb72437d2540d03215e5b20dbb809`.
- Existing blocks: required full tests belong to exact-head CI because heavy full local suites are prohibited; no live installation or reload in this implementation.

## Step-by-Step Implementation Plan
1. Extend the real extension lifecycle regression with streaming after the first completed answer; observe RED.
2. Release an obsolete provisional reservation on the next assistant-message start; observe GREEN and preserve cross-turn order.
3. Rebuild committed dist, update the unreleased changelog, review the frozen candidate and produce the skills-only handoff.

## Testing Plan
- Targeted `integration.test.ts` steered-run regression, including its no-steer and one-steer controls.
- Causal lifecycle binding, cross-turn publication order and dropped-final/fence regressions.
- Injected snapshot rename failures in plain, fenced and invalidation commits: EPERM/EBUSY/EACCES recover; exhausted EPERM, EIO and ENOENT reject with unchanged durable state and temporary-file cleanup. Plain commits yield between retries so pending readers can close; fenced commits retain their synchronous boundary.
- `npm run typecheck`, `npm run build`, `npm run build:check`, isolated runtime import.
- Full `npm test` via Linux/macOS/Windows exact-head CI, not run locally.
- Live confirmation only after separately approved installation/reload; no synthetic result counts as live delivery.

## Out of Scope
- Voice providers, bot/profile configuration, journal recovery and changes to lock ownership or IPC protocols. The bounded snapshot rename retry does not alter those protocols.
- Recovery or replay of already lost replies; restarting or typing into another Pi session.
