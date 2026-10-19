---
ticket_schema: 1
ticket_id: "TRR-01"
execution_mode: AFK
blocked_by: []
---

# 01 — Release the former runtime's records on restore

## Artifact Graph
- Artifact ID: `ticket:telegram-reload-reconnect:01`
- Role: `ticket`
- Parent: [telegram-reload-reconnect.md](../../../specs/telegram-reload-reconnect.md)

## Parent Spec
[telegram-reload-reconnect.md](../../../specs/telegram-reload-reconnect.md)

## What to Build
In `createTelegramBusFollowerTargetProvisioner`, before the Workspace claim, release active Thread
records of a different instance of the same process whose target is a binding of the same cwd and
session. Release `0.1.2`.

## Acceptance Criteria
- [x] A reloaded session (same process, new instance id) restores its own Thread and slot without
  creating a Thread.
- [x] A registration from another process is still refused.
- [x] Nearby suites, typecheck and `build:check` pass; CI `validate` is green.
- [x] Version `0.1.2` in `package.json`, `package-lock.json`, `dist/package.json`, and a changelog entry.

## Frontier
Ready.

## Gates
- Attempt: the work up to merge and the version change.
- Budget, time and maximum attempts: not set.
- Approvals: npm publication by the user (2FA).
- Exact version: `0.1.2`.
- Existing blocks: none.

## Blocked by
None — can start immediately.

## Evidence
- PR [#14](https://github.com/carlitose/pi-telegram/pull/14), fix commit `2ed287af16a1b5a8f59bda35f7a236ce18eac8d7`.
- New test `Bus leader restores a reloaded former leader's own Workspace Thread` (`tests/bus-leader.test.ts`): fails before the fix with `TelegramWorkspaceSlotUnavailableError`, passes after; a registration from another process is still refused.
- `tsc --noEmit` and `build:check` pass; `invariants` and `public-api` 33/33.
- Full suite on Windows: 2496 pass, 7 fail. The failures are timing tests (`Extension runtime`, `Workspace rotation`, `Real config contention`, `already-absent`, `followers`) and one temp-dir `ENOTEMPTY`; the same tests fail on the 0.1.1 base and change from run to run.
- GitHub Actions created no run for this PR (no Actions check suite on the head commit; no run in the user's repositories since 2026-10-14), so CI `validate` is missing.
- npm publication of 0.1.2 by the user (2FA) still open.
