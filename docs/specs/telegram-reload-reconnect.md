# A reloaded session loses its own Telegram Thread

## Artifact Graph
- Artifact ID: `artifact:telegram-reload-reconnect-spec`
- Role: `spec`
- Standalone: true
### Children
- [01 Release the former runtime's records on restore](../tickets/telegram-reload-reconnect/done/01-release-former-runtime.md)

## Type and evidence
Bug analysis. The user reported on 2026-10-19 that Telegram "disconnects and then no longer works".
Installed `@carlitose86/pi-telegram-reactive` `0.1.1`, two Pi sessions on one bot:

| Time (UTC) | Event |
| --- | --- |
| before 10-14 23:44 | process 23596 (`agent-skills`, Thread N) leads; process 29656 (`si`, Thread P) follows |
| 10-14 23:44:54 | 23596 runs `/reload`: the leader bus pipe disappears |
| 10-14 23:45:05 | 29656 promotes itself to leader |
| 10-14 23:45:07 | 23596, now instance `23596:1792021501002`, asks to restore its Workspace Thread: "Telegram follower auto-connect refused by leader: Workspace binding unavailable." and "did not restore this session." |
| up to 10-19 | 29656 keeps polling; 23596 never reconnects |

The state file still holds an active Thread record for Thread N owned by `23596:1792001286678`,
the runtime before the reload. The restore does not carry a previous instance id
(`restoreFollowerWithLeader` passes only `restoreWorkspace: true`), so:
- `claimWorkspaceIdentity` treats that record as a live peer and refuses the binding;
- even past the claim, the provisioner cannot allocate slot N, still held by the old record
  (`TelegramWorkspaceSlotUnavailableError` in the reproduction test).

The lock layer does not retry after the refusal.

## Goal
When the leader provisions a follower registration with a Workspace cwd, it first releases
(`markOfflineByInstanceId`) each active Thread record whose instance id is a different instance of
the same process (`isSameTelegramProcessInstance`) and whose target is a Workspace binding of the
same cwd and session id. A reloaded session then restores its own Thread and slot. A record of
another process keeps its protection.

## Non-goals
- Retrying a refused restore.
- Changing the instance id format or the lock layer.

## Failure modes
- Releasing a live runtime: one Pi process runs one runtime at a time; a reload shuts the former
  one down first. Only records of the same cwd and session are touched.
- PID reuse after a crash: the former owner is dead, so releasing it is correct.

## Gates
- Attempt: the work up to merge on `release/reactive-next-0` and the `0.1.2` version change.
- Budget, time and maximum attempts: not set.
- Approvals: npm publication needs the user's 2FA in their own terminal.
- Exact version: `0.1.2`.
- Existing blocks: none. Searched `docs/specs/`, `docs/tickets/`.

## Verification
- `tests/bus-leader.test.ts`: a restore from `100:2000` reuses Thread 42 and slot N held by
  `100:1000`, with no new Thread; a restore from `200:2000` is still refused.
- Nearby suites (`bus-leader`, `threads`, `bus-follower`, `sync`, `locks`), `tsc --noEmit`,
  `build:check`; CI `validate`.
