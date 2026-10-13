---
ticket_schema: 1
ticket_id: "03"
execution_mode: AFK
blocked_by:
  - "01"
  - "02"
---

# Answer Pi dialogs from Telegram with selective notification

## Artifact Graph
- Artifact ID: `artifact:telegram-remote-dialogs-03`
- Role: `ticket`
- Parent: [telegram-remote-dialogs.md](../../specs/telegram-remote-dialogs.md)

## Parent Spec
[Telegram remote input and selective waiting notification](../../specs/telegram-remote-dialogs.md), target behavior 3–5.

## What to Build
Use the verified Pi public dialog API from 02 and exact healthy target from 01. Present supported dialogs in the assigned Thread; accept an authorized reply once. Send one normal (non-silent) alert per answerable dialog, with an optional policy to silence routine delivery without changing current defaults. Sound remains user/device-controlled.

## Acceptance Criteria
- [ ] The paired owner answers `select`, `confirm`, `input` and `editor` from the correct Telegram target; the same Pi session resumes with exactly one typed response.
- [ ] Wrong user/Thread/profile, stale/duplicate reply, local answer, abort or session replacement cannot settle pending remote input.
- [ ] Delivery/transport failures never claim a remotely answerable dialog; local UI remains usable.
- [ ] One attention alert per new dialog, no repeated polling/tool/token alerts; routine mute is opt-in.
- [ ] Classic and leader/follower integration and packaging checks pass; device sound is not claimed without live observation.

## Frontier
Dependency-blocked by 01 and 02. A draft implementation and unit tests exist for review only; do not mark complete, merge, activate or install as a working dialog path until the public Pi response contract/version and healthy Thread delivery are verified. Optional routine mute, host/bridge integration and live checks remain open.

## Step-by-Step Implementation Plan
1. Add failing host/bridge tests for each dialog type, remote cancellation/timeout and safe fallback to the local UI.
2. Implement target-scoped dialog delivery and reply routing with cancellation and diagnostics.
3. Add selective notification policy, build `dist/`, verify causal and mandatory checks, and document device sound limits.

## Testing Plan
Focused dialog/lifecycle/routing tests, typecheck, distributive build and required full profile; disposable live Pi+Telegram and notification testing remains environment-gated.

## Out of Scope
- `custom()` components without a public typed response contract, remote terminal, arbitrary Pi commands, updating installed Pi binary.
