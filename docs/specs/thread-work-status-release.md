# Visible Thread work-status release

## Artifact Graph
- Artifact ID: `artifact:thread-work-status-release`
- Role: spec
- Standalone: true
- Children: [Release ticket](../tickets/thread-work-status-release/01-release.md)

## Goal and scope
Prepare 0.1.9 of `@carlitose86/pi-telegram-reactive` on current `main`, preserving the released 0.1.8 fixes. Include the completed silent exact-Thread work-status feature and a brief optional `@carlitose86/pi-telegram-stt` companion reference. The operator publishes npm `latest`; this work must not publish npm, push release tags, or modify Pi core.

## Behavior and invariants
- Observe working, extension-owned waiting, settled idle, and unknown compaction state through public Pi lifecycle hooks, independently of Activity verbosity.
- Idle means settlement, never task success. Disconnect/crash can leave the last observation visible.
- Preserve the exact chat/Thread, silent initial delivery, ordered edits, session/transport fencing, and non-blocking Pi hooks. An ambiguous send is not replayed.
- STT is an optional separate package with operator-installed engines/models; do not imply the bridge bundles transcription or downloads models.
- Keep source and committed distributive synchronized. Preserve existing export, peer and installation identities.

## Acceptance and implementation
1. Reconcile the feature onto current `main` without losing 0.1.8 fixes; update version/lock/distributive and changelog for 0.1.9, with `latest` publication metadata.
2. Document stable installation and the optional local STT companion without claiming new live acceptance.
3. Run packaging/graph preflight, focused status/bindings/integration checks, typecheck and mandatory validation. Review inline, not independently. Require exact-head Linux/macOS/Windows CI before merge.
4. Integrate under the user's merge instruction, with provider readback. Prepare the personal-config npm pin separately; its integration waits for actual npm availability or an explicit decision to use an immutable Git source.

## Evidence limits
Earlier source checks and a patched installed 0.1.8 plus the operator's visible-status confirmation are prior evidence, not tests of this release candidate. Prior Windows full-suite attempts reported symlink EPERM/timeouts; their total cost and exact candidate identities are unavailable after compaction and remain unknown. The complete device/role matrix remains post-release acceptance, not production-readiness evidence.

## Gates
- Attempt: preparation through authorized Git integration and handoff.
- Budget, time, maximum attempts and quality retry limit: none set by the user.
- Approvals: user authorized preparation, main integration, STT mention and personal-config update in the original request retained in the conversation summary. npm publication remains exclusively the user's action; no release-tag push or Pi-core modification is authorized.
- Exact version: not user-constrained; select unused stable successor 0.1.9 after registry inspection (`latest` and `next` currently 0.1.8).
- Existing blocks searched: AGENTS.md, BACKLOG.md, package/lock metadata, release/validation workflows and both repositories' open PRs. Exact-head platform CI is required. ABCd context validation is unavailable locally and must remain an explicit validation limit. Full live matrix is post-release acceptance.
- Personal config: npm 0.1.9 is unavailable until operator publication. The question whether to wait or use an immutable Git source was asked; no answer has been observed. This gates only the dependent consumer integration.

## Verification strategy
Inspect the delivered artifact graph and manifest before expensive checks. Run focused lifecycle/transport-fencing and exact-target tests plus package invariants, typecheck, build/check, package-content check and Domain DAG validation. The repository requires npm test for lifecycle changes; run one current-candidate attempt, preserving failures and durations. Exact-head CI provides separate platform observations; it is not a live Telegram/device check. Validate the canonical release audit without claiming publication or production readiness.
