# Final-only assistant delivery

## Artifact Graph
- Artifact ID: `spec:final-only-replies`
- Role: spec
- Standalone: true
### Children
- [01 Final-only delivery](../tickets/final-only-replies/01-final-only-delivery.md)

## Request and decision
The operator requested that Telegram receive only completed answers rather than silent intermediate messages, preserving errors and confirmation requests, then updating pi-personal on Winbox and Mac.

Add one opt-in setting, `assistant.finalOnly: true`, exposed as **Final replies only** in Settings. It suppresses intermediate assistant segments before publication admission, disables effective draft previews, and makes effective technical activity quiet. Absent/false retains existing delivery. Existing activity and preview preferences are preserved and restored when the filter is disabled. This is one policy, not three independently rewritten preferences.

## Baseline and ownership
`lib/activity.ts` admits intermediate segments before final-turn deduplication. Filtering only in the sender would incorrectly mark hidden commentary as already published and could lose an empty-final fallback. Filter before admission and recheck before queued publication. Keep normalized public Activity events and Pi history intact. `lib/config.ts` owns persisted/effective policy, `lib/menu-settings.ts` owns the setting, and `lib/bindings.ts`/`lib/extension.ts` connect the policy.

## Observable behavior and invariants
- With final-only enabled, Telegram/local/autonomous/unknown intermediate segments cause no send, outbound transform, button registration, preview preparation or publication reservation.
- Telegram final/error/abort delivery remains owned by the queue; local/autonomous final and terminal-partial segments retain current ordering, target and authority fences.
- Hidden Telegram commentary is not marked published: if the last assistant message is empty, the existing fallback can still deliver the last useful answer once at settlement.
- Technical thinking/tools and drafts are hidden while enabled, without changing stored activity/draft preferences. Native typing, queue/menu/status notices, operator prompt echoes, explicit message/attachment tools and confirmation dialogs remain unchanged.
- Final buttons, files, voice, Rich/HTML rendering and public Activity observation remain unchanged. Do not classify questions by punctuation.
- The setting is shared in telegram.json like other assistant controls; profiles, credentials, sessions and journals are not copied or reset.

## Implementation and acceptance
One package slice covers setting persistence, effective policy, projection, menu, documentation, regression tests and rebuilt dist. Test rich/HTML and direct/follower routes, all source placements, disabled-mode behavior, hidden-segment deduplication, preserved preferences, settlement fallback and runtime cancellation. Preserve existing tests for dialogs, errors, abort and artifacts.

After authorized release, a separate pi-personal consumer slice pins the published package, validates registry/tag/bytes, integrates the pin and runs the supported updater. Set finalOnly on both owned installations only after identity readback. Reload remains an explicit operator action.

## Verification strategy

The unchanged baseline journal contention regression also required 12.065 seconds on Windows with its sleep disabled, exceeding its 10-second child-process harness deadline. Increase only that harness deadline to 60 seconds; keep every method, actual acquisition check, preservation assertion, production retry count and production timeout unchanged. A pristine baseline probe with that single adjustment passes. Re-run the isolated test and mandatory package profile; retain prior failures.
Run causal config/activity/bindings/menu tests RED then GREEN. At a stable candidate run build, typecheck, the full package test profile required for lifecycle/rendering changes, build:check, import and package checks, and the repository context validator where available. Run full validation/CI only when admitted by the candidate and release policy. Record failed attempts and durations; do not treat simulated transport as live Telegram evidence.

## Gates
- Attempt: implementation through skills-only handoff; separately authorized release and two-machine synchronization follow integration.
- Budget, time, maximum attempts: none set; no external spend authorized.
- Approvals: local implementation/tests and Winbox/Mac updates authorized. The user's affirmative instruction «installalo ovunque», responding to the explicit merge/npm authorization request, authorizes commit/PR/push, merges in both repositories and the tag/release/npm publication necessary for this exact change only. It is not repository-wide authority. Reload/restart and Pi binary updates are excluded.
- Exact version: none requested; start from release/reactive-next-0 at dd694816ee8a1b57bd17235b0d4c3bdefbd856f4, freshly observed upstream. Select an unused next package version only for an authorized release.
- Existing blocks: Mac updater failed before pull with Keychain -25308 and no non-interactive GitHub credentials. Source branch and installed package identity, release/validate workflows, backlog, updater and manifest were inspected. Unrelated host/live-gated backlog items are not claimed resolved.

## Out of scope
Pi host prompt APIs, queue redesign, transport ownership, journal cleanup, deleting old messages, other dependencies, publication to upstream llblab, new approval mechanisms, and automatic reload.
