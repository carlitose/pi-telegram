---
ticket_schema: 1
ticket_id: "02"
execution_mode: HITL
blocked_by: []
---

# Establish public Pi remote-dialog response contract

## Artifact Graph
- Artifact ID: `artifact:telegram-remote-dialogs-02`
- Role: `ticket`
- Parent: [telegram-remote-dialogs.md](../../specs/telegram-remote-dialogs.md)

## Parent Spec
[Telegram remote input and selective waiting notification](../../specs/telegram-remote-dialogs.md), target behavior 2.

## What to Build
Coordinate with the Pi host owner on a versioned extension-facing request and typed single-settlement response API for `select`, `confirm`, `input`, and `editor`. Current `ui_prompt_start/end` are notification-only. Record verified host API/version in the parent spec. Do not patch the installed Pi binary or private runner.

## Acceptance Criteria
- [ ] Official API exposes request ID, session generation, origin, safe prompt/options and cancellation/timeout behavior.
- [ ] One accepted remote answer settles the dialog; a decline, delivery failure or bounded timeout opens the normal local UI. Stale/duplicate answers cannot settle it, preserving confirmation semantics.
- [ ] Host tests prove fallback, expiry, replacement and competing responses; a consumable host version is available.
- [ ] If host API is declined, ticket 03 remains blocked until a supported alternative is verified.

## Frontier
HITL external-host gate: public API requires its owning Pi repository and authorized host integration. Draft upstream PR #10123 was automatically closed because the account lacks prior maintainer `lgtm`; `CONTRIBUTING.md` requires the operator's own concise template issue for approval, green `npm run check` and `./test.sh` before another PR, and leaves changelog edits to maintainers. The host fork branch retains the candidate; this ticket grants no host release or binary installation authority.

## Step-by-Step Implementation Plan
1. Agree on Pi's public request/response boundary and version with its owner.
2. Implement/test in the host repository under separate authorization.
3. Capture published API, host test evidence and version in the parent spec.

## Testing Plan
Host typed-response, cancellation, bounded timeout, local fallback, competing remote responders and replacement tests; no live Telegram claims.

## Out of Scope
- Private runtime imports, terminal injection and bridge implementation (ticket 03).
