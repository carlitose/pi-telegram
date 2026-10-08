# Callback Namespace Standard

Telegram `callback_data` is one bot-wide namespace. Any extension that creates inline buttons for a bot shared with `pi-telegram` must use namespaced callback data.

## Format

```text
<namespace>:<action>[:<payload>]
```

Examples:

```text
vividfish:approve:123
vividfish:deny:123
myext:page:2
```

## Rules

- Use a stable extension-owned namespace, preferably the package or extension name without scope punctuation.
- Keep the namespace lowercase ASCII: `a-z`, `0-9`, `_`, `-`.
- Do not use `pi-telegram` owned prefixes: `compact:`, `new:`, `question:`, `tgbtn:`, `menu:`, `model:`, `thinking:`, `status:`, `queue:`, `settings:`, `section:`. Current app navigation uses `menu:`; `status:` remains reserved for legacy/owned status callbacks but is not emitted by current UI. `compact:` and `new:` are owned by their destructive-action confirmation dialogs. `section:` is owned by the Extension Sections platform (0.10.0+), documented in [Extension Sections](./sections.md). `settings:` is owned for the built-in Settings submenu.
- `question:` belongs to host-gated typed question offers. Single-select buttons settle their exact pending producer before best-effort ACK, fenced by sender, bot, chat/Thread, question message, opaque token, session and transport authority. Expired/invalid callbacks are consumed as unavailable, never forwarded into the ordinary prompt queue. This does not make ordinary choices blocking or establish live mobile-dialog support.
- Keep the full `callback_data` within Telegram's 64-byte limit.
- Put only opaque ids or small enum values in payloads; do not store secrets, full prompts, or large state.
- Treat callbacks as untrusted input. Validate namespace, action, and payload before executing side effects.

## pi-telegram fallback

If `pi-telegram` receives callback data that is not owned by its built-in prefixes and no built-in handler consumes it, it forwards the click to Pi as:

```text
[callback] <callback_data>
```

Layered extensions may intercept that message and handle their own namespace. If no extension handles it, the assistant may see the fallback message and should tell the user the callback was not handled and the environment may be misconfigured.

## Extension sections

[Telegram Extension Sections](./sections.md) are a higher-level UI contract over this namespace rule. A section owns a canonical extension identity such as `@carlitose86/pi-telegram-reactive-explorer`, but its Telegram `callback_data` should use the `pi-telegram` owned `section:` prefix plus a compact token, because Telegram limits callback payloads to 64 bytes.

Conceptual form:

```text
section:<token>:<action>[:<payload>]
```

The token maps back to the full section identity inside the section registry. Section authors should not hand-roll `section:` callbacks outside the section context helpers, and ordinary layered extensions should continue using their own namespace plus update handlers or the `[callback]` fallback.
