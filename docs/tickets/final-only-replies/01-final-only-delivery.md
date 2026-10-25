---
ticket_schema: 1
ticket_id: "01"
execution_mode: HITL
blocked_by: []
---

# Final-only Telegram delivery

## Artifact Graph
- Artifact ID: `ticket:final-only-replies:01`
- Role: ticket
- Parent: [Final-only assistant delivery](../../specs/final-only-replies.md)

## Parent Spec
[Final-only assistant delivery](../../specs/final-only-replies.md)

## What to Build
Implement the spec's opt-in assistant.finalOnly setting end to end, including Settings, suppression before assistant publication admission, effective quiet activity/no drafts, tests, docs and rebuilt dist. Preserve errors, aborts, confirmation dialogs, final artifacts and public Activity events.

## Acceptance Criteria
- [ ] Intermediate segments from every source are hidden before admission when enabled; final and terminal-partial delivery stays intact.
- [ ] Empty-final fallback remains deliverable; no hidden intermediate is marked published.
- [ ] Drafts/technical activity are effectively disabled without overwriting stored preferences; disabling restores existing behavior.
- [ ] Settings can persist and display the filter; Rich/HTML and direct/follower tests pass.
- [ ] Target/authority/settlement/order tests remain green; generated distributive matches source.

## Frontier
Implementation ready; scoped Git/provider/npm delivery is authorized by the user's reply. Release waits for current exact-head validation; Mac synchronization additionally awaits GitHub access.

## Gates
- Attempt: implementation through skills-only handoff; separately authorized release and two-machine synchronization follow integration.
- Budget, time, maximum attempts: none set; no external spend authorized.
- Approvals: implementation and Winbox/Mac updates authorized; «installalo ovunque» affirmatively answers the explicit preceding merge/publication request and authorizes only the Git/provider/tag/npm delivery needed for this change. No repository-wide grant, reload/restart or Pi binary updates.
- Exact version: none; fresh base release/reactive-next-0 dd694816ee8a1b57bd17235b0d4c3bdefbd856f4.
- Existing blocks: Mac Keychain -25308; unrelated host/live backlog remains unchanged.

## Step-by-Step Implementation Plan
1. Reproduce suppression and effective-policy failures in mirrored tests.
2. Add config/menu policy and wire its gate before projection admission, preserving public observation and fallback.
3. Run focused checks, simplify GREEN diff, rebuild dist and run required stable-profile checks.
4. Freeze CandidateRef, review inline, record QA/checks and open delivery gates.

## Testing Plan
Config, Activity, bindings, menu, queue fallback and remote-dialog causal suites; full package profile at stable gate because delivery/lifecycle changes; build/typecheck/import/pack checks. No live Telegram send/reload is inferred from tests.

## Out of Scope
Other dependencies, Pi core, queue/transport redesign, public Activity filtering, new approval protocols, and unrelated backlog repairs.
