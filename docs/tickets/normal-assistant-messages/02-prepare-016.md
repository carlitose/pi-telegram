---
ticket_schema: 1
ticket_id: "02"
execution_mode: AFK
blocked_by:
  - "01"
---

# Prepare the normal-text update as npm 0.1.6

## Artifact Graph
- Artifact ID: `ticket:normal-assistant-messages:02`
- Role: ticket
- Parent: [Normal assistant messages](../../specs/normal-assistant-messages.md)

## Parent Spec
[Normal assistant messages](../../specs/normal-assistant-messages.md)

## What to Build
Prepare version 0.1.6 locally from the installed/accepted normal-text implementation. Align root package and lock metadata, rebuild dist/package.json, title the normal-text changelog section and produce/inspect a real npm tarball. Do not alter implementation, dependencies, default policy, host packages or the consumer pin.

## Acceptance Criteria
- [ ] Fresh public registry observation shows no 0.1.6 collision; retain current dist tags without mutation.
- [ ] Root, lock and generated versions all equal 0.1.6; dependency graphs and publishConfig next/public unchanged.
- [ ] Tarball contains the exact current source/dist closure, metadata, canonical spec/tickets and proper bundled Skills; no tests/private/runtime state or node_modules accidentally shipped.
- [ ] Build, reproducible dist, import/typecheck, audit and pack checks retain actual outcomes; prior tests remain attached to original identities, no gratuitous complete-suite repeat.
- [ ] Handoff identifies the tarball/hash and publication command only as a later gated action, with CI/full-profile/live evidence limits explicit.
- [ ] No commit/push/PR/tag/npm publication, host install/reload/core or consumer-pin change.

## Frontier
Ready for local preparation. Dependency 01 has verified disk installation receipts and the user's `si funziona` confirmation, without inferring Git integration or automated per-host acceptance. Exact-head CI and publication are subsequent gates, not permission to skip local work.

## Gates
- Attempt: local 0.1.6 preparation through verified artifact handoff.
- Budget, time, maximum attempts: none set; no external spend.
- Approvals: operator `fallo` after the new npm-version consolidation proposal authorizes local preparation only. Commit/push/PR/tag, merge, publication, host updates/reload and consumer-pin changes remain ungranted/out of scope.
- Exact version: 0.1.6, subject to fresh public-registry availability; installed host baseline remains 0.1.5 + local patch.
- Existing blocks: no implementation-start block. Release readiness retains exact-head Linux/macOS/Windows validation from .github/workflows/validate.yml and release.yml; Git delivery authority is missing for starting that CI. Prior full profile had a concurrency failure; bounded rerun reported 2668 PASS/0 FAIL but individual npm-test exit was not retained. No fresh full-pass/CI/live claim may be fabricated.
- Source: actual checkout branch fix/windows-journal-inspection, HEAD 4ce386e060b8ec51cd1952fe6161971019991392; remote release/reactive-next-0 is at the same commit, frozen implementation tree d9a13d32bb74650a5508f4f2b1f4288208871b57. Older prose named the remote branch as checkout without checking it; corrected from current readback, no branch switch. Preserve every pre-existing staged change.

## Step-by-Step Implementation Plan
1. Normalize/validate inputs, source/index/remote and artifact graph; record previous checks and admitted packaging-only cost.
2. Verify registry availability, change only package-version metadata/changelog/open-work truth, rebuild generated metadata.
3. Freeze the exact candidate; inline simplification/review and causal package checks, with real tarball file/identity verification.
4. Hand off artifact provenance and open release/CI/publication gates. No inferred provider authority or host mutation.

## Testing Plan
Version/dependency equality against frozen base, exact packaged file map/source parity, changelog bounds and graph links; build/build:check/import/typecheck/audit/pack. Real archive inspection rather than an assumed dry-run artifact. Runtime/tests unchanged, therefore no new complete suite solely for version metadata. CI remains required for release readiness and cannot be replaced by old local evidence.

## Out of Scope
Implementation changes, dependencies, core SDK, new public behavior, consumer pin, host sync/reload, Git/provider/npm delivery, migration and independent workers.
