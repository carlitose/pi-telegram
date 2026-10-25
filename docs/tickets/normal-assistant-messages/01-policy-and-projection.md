---
ticket_schema: 1
ticket_id: "01"
execution_mode: AFK
blocked_by: []
---

# Deliver completed ordinary assistant text without code or technical activity

## Artifact Graph
- Artifact ID: `ticket:normal-assistant-messages:01`
- Role: ticket
- Parent: [Normal assistant messages](../../specs/normal-assistant-messages.md)

## Parent Spec
[Normal assistant messages](../../specs/normal-assistant-messages.md)

## What to Build
Add one opt-in normalTextOnly policy using existing assistant delivery. Project code/diff blocks out of visible text, preserve prose/actions and existing authority, quiet technical output and disable token previews. No Goal/Loop or SDK lifecycle changes. Build source/dist together and prepare the package patch locally only. Dormant configuration is already staged. With the operator's subsequent installation-only authorization, install the verified unpublished local patch on Winbox and Mac; preserve backups, private configuration, pin, dependencies and Pi core, without reload.

## Acceptance Criteria
- [ ] Intermediate and final ordinary text use existing once-only, target-bound delivery without waiting for automation completion.
- [ ] Code/diff blocks disappear, prose and legitimate controls survive, empty output sends nothing, transforms cannot restore excluded code.
- [ ] Effective finalOnly false/drafts false/activity quiet under normalTextOnly; stored preferences remain intact, older runtime stays final-only until reload.
- [ ] Normal setting is persistent and exposed in Settings; enabling final-only exits normal mode.
- [ ] Config, rendering, outbound/binding and integration regressions plus required stable profile/build checks retain honest results.
- [ ] On each host back up the exact public 0.1.5 package and install only the verified local package patch. Verify all installed file hashes and preserve normalTextOnly:true/finalOnly:true, settings/auth, bundle pin/head and unrelated packages. No Pi core, automatic reload/restart, live automation, publication, credentials or journal mutation; disk readback is not active-session acceptance.

## Frontier
Ready: desired behavior explicit; existing finalOnly/draft/activity mechanisms inspected. No design choice or implementation-start approval missing.

## Gates
- Attempt: validated local implementation through authorized patch installation and disk/config readback on both hosts.
- Budget, time, maximum attempts: none set.
- Approvals: local patch installation on Winbox/Mac now authorized by the operator's `ok conitnua e poi fallo`, confirmed by `Continua` after the installation-only plan. No Pi core/reload/restart/live automation/Git provider/tag/npm/credential changes.
- Exact version: published host baseline 0.1.5, no new release authorized.
- Existing blocks: preserve frozen producer baseline tree 96f3c870b1f532ff2b0f6ef17b287f90266559ce on release/reactive-next-0, HEAD/remote 4ce386e060b8ec51cd1952fe6161971019991392. Prior failed full profiles and ABCD/live/CI gaps stay visible; not blockers to local implementation.

## Step-by-Step Implementation Plan
1. Canonically validate inputs, scope, graph and baseline, record verification cost.
2. RED/GREEN focused policy, projection, output and settings tests; wire only live ports at composition root.
3. Rebuild, freeze, simplify/review inline and execute admitted stable checks, preserving failures.
4. With current installation authority, compose the local patch from the exact public baseline and owned source/dist changes. Revalidate hosts, stage and probe before swapping, retain complete on-host backups, and verify full file maps/private configuration and offline compiled-policy behavior. Never reload or claim active runtime; retain release/full-profile evidence limits.

## Testing Plan
Causal config/rendering/outbound/settings/activity/binding tests, code-only and action-containing messages, source placements, transformed output and stale authority. Required stable rendering profile, types/build/pack/DAG/context checks. No replay of private logs or real Telegram sends.

## Out of Scope
Goal/Loop internals, settled-run aggregation, new schedulers, permission schemas, actor/transport changes, other packages, Pi core, Git/npm delivery and reload.
