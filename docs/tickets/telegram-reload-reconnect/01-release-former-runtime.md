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
- Parent: [telegram-reload-reconnect.md](../../specs/telegram-reload-reconnect.md)

## Parent Spec
[telegram-reload-reconnect.md](../../specs/telegram-reload-reconnect.md)

## What to Build
In `createTelegramBusFollowerTargetProvisioner`, before the Workspace claim, release active Thread
records of a different instance of the same process whose target is a binding of the same cwd and
session. Release `0.1.2`.

## Acceptance Criteria
- [ ] A reloaded session (same process, new instance id) restores its own Thread and slot without
  creating a Thread.
- [ ] A registration from another process is still refused.
- [ ] Nearby suites, typecheck and `build:check` pass; CI `validate` is green.
- [ ] Version `0.1.2` in `package.json`, `package-lock.json`, `dist/package.json`, and a changelog entry.

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
