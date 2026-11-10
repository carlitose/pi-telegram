# Closed Pi sessions keep their Workspace letters forever

## Artifact Graph
- Artifact ID: `artifact:telegram-dead-owner-slots-spec`
- Role: `spec`
- Standalone: true
### Children
- [01 Keep journal completeness for an empty key set](../tickets/telegram-dead-owner-slots/01-empty-key-set-completeness.md)
- [02 Detach persisted owners whose process is gone](../tickets/telegram-dead-owner-slots/02-detach-dead-persisted-owners.md)
- [03 Prove inactivity of ownerless bindings](../tickets/telegram-dead-owner-slots/03-ownerless-binding-inactivity.md)

## Type and evidence
Bug analysis. On 2026-11-10 the user reported that closing a Pi does not free Telegram and, once
the letters ran out, no further Pi could connect: `No Telegram slot available. Check
/telegram-status --debug.` Installed `@carlitose86/pi-telegram-reactive` `0.1.7` on Windows,
Thread cleanup on (default), one bot profile.

`logs.jsonl` recorded `Telegram Workspace slots A-Z are unavailable; rotation blocked
(protected-capacity).` on every connect. `state.json` held 26 Workspace bindings `A`–`Z` and 7
`active` Thread records; every one of the 18 owner PIDs in records and journal keys was absent,
every journal was empty (snapshot plus segments), no admission lease or retirement was pending.
Replaying that snapshot through the real store and `planTelegramWorkspaceSlotAllocation` with the
production live-owner rule gave the same `protected-capacity`:

| Letters | Count | Why the slot never frees |
| --- | --- | --- |
| C F I R T W P | 7 | Persisted `active` record of a dead process. Nobody re-checks persisted records: the dead-owner path only sees followers registered in the current leader's memory (`pruneFollowers`). |
| A B D E H J L M N O Q S U V X Y Z | 17 | No current record and no `inactiveSinceMs`: removed by `markStaleByTarget` (non-`deleted`), `markOfflineByInstanceId` or record displacement, which never stamp inactivity. |
| G K | 2 | Inactive, but `journalBindingsComplete` missing, so live-owner evidence is `unknown`. |

Four mechanisms:

1. **Ungraceful exit leaves an active record.** On Windows Pi registers `SIGHUP` only off `win32`
   (`interactive-mode.js` `registerSignalHandlers`), so closing the terminal window kills Pi
   without `session_shutdown`; a crash or a kill does the same on every platform. A follower that
   dies while no leader runs, and any leader that dies this way, keeps an `active` record forever.
2. **Record removal without inactivity.** Only confirmed deletion (`markStaleByTarget(...,
   "deleted")`) and fenced owner detachment stamp `inactiveSinceMs`. Other removals leave a
   binding that can never become eligible, by contract.
3. **Completeness lost for an empty key set.** `upsertWorkspaceBinding` drops
   `journalBindingKeys` when the merged set is empty but keeps `journalBindingsComplete`;
   normalization on the next load then drops completeness because the key array is missing.
   A probe confirmed it: a leader binding is complete after the first upsert and reload, and not
   after the second. Every recovered leader binding therefore becomes `unknown` forever.
4. **No operator path.** Manual cleanup also requires `inactiveSinceMs`.

The operator unblock of 2026-11-10 removed the 7 dead records and all 26 bindings from
`state.json` after a backup (`state.json.bak-slot-unblock-20261110`); the Telegram Threads were
left in place. It is evidence, not part of this fix.

## Goal
A Pi that ends without a graceful Telegram detach, for any reason, no longer holds its letter
forever. The leader proves the owner's death from exact process evidence, detaches the record
without deleting Telegram content, and stamps the binding's first proven inactivity. The existing
pressure rotation then reclaims the oldest proven-inactive, fully unprotected binding when `A`–`Z`
are exhausted.

Target behavior:
- **Dead persisted owner.** For every persisted current Thread record (`active`/`starting`) whose
  owner is not this runtime and not a registered follower, the leader checks the exact owner PID.
  Only an absent PID proves death. A dead owner with exactly one matching Workspace binding is
  detached through the existing fenced owner detachment, which stamps `inactiveSinceMs`; a dead
  owner without a binding has its record released so its letter stops reserving capacity.
- **Ownerless binding.** A binding with no current record, claim, reservation, pending
  provision/cleanup/retirement, no registered follower on its target and no `inactiveSinceMs` is
  stamped with the observation time when its known owners are all proven dead: the recorded last
  owner instance, or, for a binding without one, a complete non-empty journal-key set. A binding
  with neither stays ineligible (legacy rule unchanged).
- **Completeness.** A binding whose journal-key set is complete and empty stays complete across
  upserts and reloads.
- **Triggers.** Once, one follower-staleness window after the leader's polling starts (the same
  wait as startup display contraction, so live followers re-register first and early
  registrations do not compete for profile admission), and before pressure rotation when an
  allocation fails with `TelegramWorkspaceSlotUnavailableError`. Both run only where a pressure
  rotation runner exists, since inactivity evidence only serves rotation. No periodic timer; the
  one-shot startup timer is cancelled by stop or restart. A lost admission acknowledgement is
  retried once with the same operation id so no profile lease leaks.

## Decisions
- **Non-destructive reconciliation.** Detaching a dead owner never deletes its Thread, whatever the
  Thread-cleanup setting. Deleting a Thread does not free its letter anyway (the binding keeps it);
  the only Telegram deletion stays the existing one-Thread-per-needed-slot rotation. Rejected:
  applying the cleanup setting at reconciliation, which would delete history from cold evidence.
- **Death proof is an absent exact PID.** Follower ids (`PID:generation:…`, `PID:start:…`) use
  `getTelegramProcessBirthIdentityLiveness`; leader ids (`PID:createdAtMs`) use the PID check.
  Alive, unverifiable or reused PIDs stay protected. Elapsed time and heartbeat silence are never
  evidence.
- **Inactivity time is the observation time.** Never back-dated from `updatedAtMs` or file age.
- **No signal handling in pi-telegram.** The missing Windows `SIGHUP` handler belongs to Pi core;
  crash-safe reconciliation covers it and every other ungraceful exit.

## Non-goals
- A Pi core change for Windows window close (report upstream separately).
- Per-slot reasons in `/telegram-status --debug` (worth a follow-up spec).
- Making legacy bindings without any owner evidence eligible.
- Changing rotation order, its deletion protocol, or the Thread-cleanup setting.

## Invariants and failure modes
- Never detach or stamp a binding whose owner PID is alive or unverifiable, that a registered
  follower targets, or that has a current record, claim, reservation, pending provision, cleanup or
  retirement intent.
- Reconciliation runs under profile-wide Workspace admission, captures leader epoch and profile, and
  rechecks them before each store publication; a lost epoch or profile change ends it without
  effects. Detachment keeps the existing exact owner/slot/target checks of `detachTargetOwner`.
- PID reuse makes an owner look alive: fail-closed, the letter stays until that process ends.
- A follower re-registering after reconciliation reclaims its binding as today; activation clears
  `inactiveSinceMs`.
- Older runtimes ignore the new optional binding field; a binding persisted by them loses it and
  falls back to journal-key evidence.

## Contract updates
- `AGENTS.md` §4.3 and `docs/multi-instance-bus.md` (inactivity sources): a leader may detach a
  persisted owner whose exact PID is proven absent, at leader start or under slot pressure; this is
  non-destructive and is the only new inactivity source besides last-owner proof.
- `docs/architecture.md` `threads` entry: the binding's last owner instance.
- `CHANGELOG.md` `Unreleased`: one outcome bullet.

## Verification
- Unit: store completeness across upsert/reload; owner-instance liveness for leader and follower
  ids; reconciliation skips alive, unverifiable, registered and protected owners.
- Integration: dead leader plus dead follower records, new leader starts, both bindings become
  inactive without any Telegram call; with `A`–`Z` full, one fresh connection retires the oldest
  binding and gets its letter.
- Replay of the 2026-11-10 snapshot (`.bak`) through the store and reconciliation: the plan is no
  longer `protected-capacity` for the 7 dead records' letters.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run build:check`; Domain DAG validator if a
  module import changes.
- Manual on Windows: close a follower window with the X while no leader runs, start a leader,
  confirm the letter becomes rotatable.

## Gates
- Attempt: implementation of tickets 01–03 through the local skills-only handoff.
- Budget, time and maximum attempts: not set.
- Approvals: local edits, tests and `npm run build` need none. Commit, push, PR, merge, version
  change, npm publication and local Pi package sync are `open` (not given) and outside this attempt.
- Exact version: none.
- Existing blocks: none found. Searched `BACKLOG.md` (only the activation-gated pairing item),
  `docs/specs/`, `docs/tickets/`, local branches (`fix/orphaned-provision-slot` concerns creation
  intents, already in `main`'s store).
