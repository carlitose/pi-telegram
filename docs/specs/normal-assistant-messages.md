# Normal assistant messages

## Artifact Graph
- Artifact ID: `spec:normal-assistant-messages`
- Role: spec
- Standalone: true
### Children
- [01 Normal-message policy and projection](../tickets/normal-assistant-messages/01-policy-and-projection.md)
- [02 Prepare npm 0.1.6](../tickets/normal-assistant-messages/02-prepare-016.md)

## Request and decision
The operator replaced final-only delivery with all completed ordinary assistant text, including intermediate explanations, questions and final answers, excluding thinking, tool calls/results and Markdown code/diff blocks. Do not wait for Goal/Loop completion, inspect extension names, classify prose, add timers or change automation lifecycle. No Pi core update or automatic reload/restart.

Use one opt-in `assistant.normalTextOnly: true` policy. It makes effective finalOnly false, effective draft previews false and effective technical activity quiet, without overwriting the saved finalOnly/draft/activity values. Existing assistant-segment publication and final-turn delivery retain their ownership, ordering, target, duplicate and generation fences. This is message/block delivery, not token mirroring or a new settled-run policy.

## Projection and boundaries
- Remove fenced backtick/tilde code blocks, including diff/diagram fences, indented code as recognized by the existing Markdown block parser, quoted/list-contained fences and recognizable unified-diff blocks. Withhold unterminated code fences through end of that completed message.
- Preserve surrounding prose, headings, lists, inline commands/filenames and tables. Do not guess that ordinary prose or list items are code. Empty projected text produces no message, not a filler notice or invisible character.
- Keep original Pi history and public Activity observation unchanged. Parse legitimate assistant action markup before filtering visible Markdown; never activate action-looking text inside code. Preserve native controls and explicit attachment/voice actions. Recheck the projection after configured text transforms so they cannot reintroduce code.
- Thinking and tool evidence remain excluded by the existing quiet policy; previews remain off to avoid token/code leakage. Existing direct message/view tools are not a second automatic mirror and must retain their authority boundaries.
- Expose the policy in Settings and through config controls. Enabling final-only disables normalTextOnly; switching normalTextOnly off restores stored preferences rather than rewriting them.

## Rollout and acceptance
The existing 0.1.5 installations on Winbox and Mac remain the deployment baseline. Keep stored finalOnly true while staging normalTextOnly: an older cached runtime ignores the new flag and remains safely final-only. After separately controlled disk synchronization, manual reload activates the complete new policy. Do not enable unfiltered intermediate output on the old runtime and claim the new filter is active. No reload is authorized.

Initial scope prepared code locally and staged dormant configuration. On 2026-10-25 the operator said `ok conitnua e poi fallo`, then confirmed `Continua` after the explicit installation-only plan: install the prepared local patch on Winbox and Mac, with backup/readback and no npm publication or reload. Revalidate host, exact public-0.1.5 installed identities and clean bundle; stage the verified package, keep a complete on-host previous-package backup, install the owned patch and verify every delivered file. Preserve the existing normalTextOnly:true/finalOnly:true configuration and all private data. Report the result as 0.1.5 plus an unpublished local patch, never a new registry version. No general npm install, credentials/state copying, public version claim, tag, publication, unrelated pin/dependency change or provider mutation is inferred. Record that a reinstall of the unchanged public 0.1.5 can remove the local patch until a separately authorized release integrates it.

## Verification strategy
Use RED/GREEN for config precedence/preference restoration; Markdown fences, malformed/unclosed cases, indentation, quotes/lists, raw diff and prose preservation; empty projection; action markup inside/outside code; direct/follower Rich/HTML text paths; transform reintroduction; once-only intermediate/final behavior; late-setting changes and stale authority. Reuse the real public assistant-output/final planner composition, never present a fake as live.

Validate canonical inputs/graph and the delivered source/dist closure before spending. Run narrow checks during iteration. At the stable gate run build, typecheck, the full test profile required for rendering changes, build:check/import/pack, Domain DAG and context validation if available. Preserve prior failed profiles and their identities; a new full profile is justified by changed rendering/policy, not by candidate numbering. No Bot API or session commands are required for verification.

## Official package preparation
After both hosts were connected, the operator reported `si funziona` and requested `fallo` in response to consolidating the patch in a new npm version. Prepare 0.1.6 locally: align package/lock/generated metadata and the release changelog, build and inspect a real npm tarball, preserve dependencies and all implementation code. The user confirmation is human functional feedback, not an automated per-host acceptance matrix.

Do not publish, tag, commit/push, merge, update host packages or change the consumer pin in this preparation slice. The current installed 0.1.5 local overlays stay intact. Preserve exact-head three-OS CI and prior full-profile uncertainty as release gates; local tarball validation alone is not release readiness. After authorized publication/readback, the consumer pin and host installation can be updated separately.

## Gates
- Attempt: validated local implementation through authorized patch installation and disk/config readback on both hosts.
- Budget, time, maximum attempts: none set; no external spend authorized.
- Preparation follow-up: local 0.1.6 metadata/tarball preparation is authorized by `fallo` after the consolidation proposal. Publication and Git/provider delivery remain separate, ungranted operations. Current workflow requires exact-head validation on Linux/macOS/Windows before release readiness.
- Approvals: local code preparation, safe Winbox/Mac configuration and local patch installation authorized by the operator's `ok conitnua e poi fallo`, confirmed by `Continua` after the installation-only plan. Pi core, automatic reload/restart, live automation invocation, Git/provider delivery, tag/npm publication and credential changes remain unauthorized.
- Exact version: 0.1.5 remains the installed host baseline with explicit local-patch provenance; subsequent local npm preparation targets 0.1.6, subject to a fresh public-registry collision check.
- Existing blocks: producer checkout has the frozen, uncommitted 0.1.5 snapshot tree 96f3c870b1f532ff2b0f6ef17b287f90266559ce on the actual checkout fix/windows-journal-inspection, HEAD 4ce386e060b8ec51cd1952fe6161971019991392 (remote release/reactive-next-0 matches). Earlier prose named the remote branch as checkout without observation; current branch readback corrects that attribution without changing the branch. Preserve that entire baseline. Older complete profiles and missing ABCD/live/CI evidence remain recorded, never relabeled PASS. No implementation-start blocker found.
