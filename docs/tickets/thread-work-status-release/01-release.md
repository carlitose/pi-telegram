---
ticket_schema: 1
ticket_id: "01"
execution_mode: AFK
blocked_by: []
---

# Prepare and integrate the Thread work-status release

## Artifact Graph
- Artifact ID: `artifact:thread-work-status-release-01`
- Role: ticket
- Parent: [Release spec](../../specs/thread-work-status-release.md)

## Parent Spec
[Visible Thread work-status release](../../specs/thread-work-status-release.md)

## What to Build
Prepare and integrate the bridge 0.1.9 release candidate, preserving current main fixes, documenting optional local STT, and leaving npm publication to the operator.

## Acceptance Criteria
- [ ] Silent exact-target working/waiting/idle/unknown behavior and stale-authority fencing are present with focused regression coverage.
- [ ] Version, lock, committed dist, changelog and stable installation/STT documentation agree.
- [ ] Required checks and exact-head platform CI are observed; failures, skips and live limits remain explicit.
- [ ] Authorized main integration has provider readback, or an exact remaining delivery gate is reported. No npm publication/tag push or Pi-core change occurs.

## Frontier
Ready for bridge preparation. Personal-config delivery is a separate dependent step awaiting npm availability or the operator's source decision, not part of this ticket's implementation gates.

## Gates
- Attempt: bridge preparation through integration/handoff; budget, time, maximum attempts and retry limit: none user-set.
- Approvals: preparation/main integration/STT mention authorized by the original request in the conversation summary. npm publication is exclusively the operator's action. No release-tag push or Pi-core modification.
- Exact version: none user-set; unused stable successor 0.1.9 selected after registry inspection.
- Existing blocks searched: AGENTS.md, BACKLOG.md, manifests, workflows, open PRs. Exact-head Linux/macOS/Windows CI required before merge. Missing ABCd validator and incomplete live role/device matrix stay explicit limitations; no production-readiness claim.

## Step-by-Step Implementation Plan
1. Reconcile feature onto current main, retaining the pre-delivery recovery stash and released fixes.
2. Align manifests/dist and documentation, resolving current-section conflicts without rewriting historical releases.
3. Admit verification by delivered graph/current trees; run focused checks, mandatory current-candidate suite and package/domain checks. Preserve old evidence and unknown cost.
4. Simplify only if needed, freeze, review inline, plan and execute causal QA, then validate the canonical audit.
5. Separately deliver the exact reviewed candidate through a PR and user-authorized merge after CI; retain readback and publication handoff.

## Testing Plan
Focused work-status/bindings/integration/package-invariant checks; typecheck; build/check; package-content/runtime import; Domain DAG validator; one mandatory npm test attempt; exact-head platform CI. Telegram is mocked in source tests; the earlier user confirmation is not current-candidate live evidence.

## Out of Scope
- npm publication, release-tag push, Pi binary, new transport/policy, full live acceptance, and personal-config source selection.
