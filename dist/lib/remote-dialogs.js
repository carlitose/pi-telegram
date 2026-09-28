/**
 * Remote Pi dialog bridge
 * Zones: telegram, pi agent
 * Owns one-shot, exact-target reply matching for host-offered extension dialogs.
 */
function sameTarget(a, b) {
    return a.chatId === b.chatId && a.threadId === b.threadId;
}
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] ?? character);
}
function renderDialog(event) {
    const marker = `Pi dialog [${event.requestId}]`;
    const heading = `<b>${escapeHtml(event.title)}</b>`;
    let details;
    switch (event.kind) {
        case "select":
            if (event.options.length === 0 || event.options.length > 32)
                return undefined;
            details = `${event.options.map((option, index) => `${index + 1}. ${escapeHtml(option)}`).join("\n")}\nReply to this message with the option number, or /cancel.`;
            break;
        case "confirm":
            details = `${escapeHtml(event.message)}\nReply to this message with yes or no.`;
            break;
        case "input":
            details = `${event.placeholder ? `${escapeHtml(event.placeholder)}\n` : ""}Reply to this message with your answer, or /cancel.`;
            break;
        case "editor":
            details = `${event.prefill ? `<pre>${escapeHtml(event.prefill)}</pre>\n` : ""}Reply to this message with replacement text, or /cancel.`;
            break;
    }
    const text = `${marker}\n${heading}\n${details}`;
    return text.length <= 4096 ? text : undefined;
}
function decodeAnswer(event, text) {
    const normalized = text.trim().toLowerCase();
    if (normalized === "/cancel")
        return { valid: true, value: event.kind === "confirm" ? false : undefined };
    if (event.kind === "select") {
        const choice = Number(text.trim());
        if (!/^\d+$/.test(text.trim()) || choice < 1 || choice > event.options.length)
            return { valid: false };
        return { valid: true, value: event.options[choice - 1] };
    }
    if (event.kind === "confirm") {
        if (["yes", "y", "si", "sì", "true"].includes(normalized))
            return { valid: true, value: true };
        if (["no", "n", "false"].includes(normalized))
            return { valid: true, value: false };
        return { valid: false };
    }
    return { valid: text.length > 0, value: text };
}
export function createTelegramRemoteDialogRuntime(deps) {
    const pending = new Map();
    const key = (target, messageId) => `${target.chatId}:${target.threadId ?? "all"}:${messageId}`;
    const current = (event, target, stamp, authority, ctx) => {
        const activeTarget = deps.getTarget();
        return !event.signal.aborted && deps.isCurrent(ctx) &&
            deps.getSessionId(ctx) === event.sessionId &&
            deps.isTransportStampActive(stamp) && deps.getAuthorityKey() === authority &&
            !!activeTarget && sameTarget(activeTarget, target);
    };
    return {
        async offer(event, ctx) {
            const target = deps.getTarget();
            const owner = deps.getAllowedUserId();
            const stamp = deps.getTransportStamp();
            const authority = deps.getAuthorityKey();
            if (!target || !owner || target.chatId !== owner || !deps.getBotId() ||
                !authority || !current(event, target, stamp, authority, ctx))
                return { action: "pass" };
            const text = renderDialog(event);
            if (!text)
                return { action: "pass" };
            try {
                const sent = await deps.sendMessage({
                    chat_id: target.chatId,
                    ...(target.threadId !== undefined ? { message_thread_id: target.threadId } : {}),
                    text, parse_mode: "HTML", link_preview_options: { is_disabled: true },
                    disable_notification: false,
                });
                if (!Number.isSafeInteger(sent.message_id) || sent.message_id <= 0 ||
                    !current(event, target, stamp, authority, ctx))
                    return { action: "pass" };
                deps.recordMessageOwnership({ chatId: target.chatId, messageId: sent.message_id, target });
                const messageKey = key(target, sent.message_id);
                if (pending.has(messageKey))
                    return { action: "pass" };
                return await new Promise((resolve) => {
                    const onAbort = () => finish({ action: "pass" });
                    const entry = {
                        event, target, marker: `Pi dialog [${event.requestId}]`,
                        sessionId: event.sessionId, transportStamp: stamp, authority, settle: finish,
                    };
                    function finish(result) {
                        if (pending.get(messageKey) !== entry)
                            return;
                        pending.delete(messageKey);
                        event.signal.removeEventListener("abort", onAbort);
                        resolve(result);
                    }
                    pending.set(messageKey, entry);
                    event.signal.addEventListener("abort", onAbort, { once: true });
                    if (event.signal.aborted)
                        onAbort();
                });
            }
            catch (error) {
                deps.recordError(error);
                return { action: "pass" };
            }
        },
        consume(message, ctx) {
            const original = message.reply_to_message;
            const botId = deps.getBotId();
            const owner = deps.getAllowedUserId();
            if (!botId || original?.from?.id !== botId ||
                !original.text?.startsWith("Pi dialog [") || !original.text.includes("]\n") ||
                message.from?.id !== owner || typeof message.chat.id !== "number")
                return false;
            if (typeof original.message_id !== "number")
                return true;
            const target = {
                chatId: message.chat.id,
                ...(typeof message.message_thread_id === "number" ? { threadId: message.message_thread_id } : {}),
            };
            const entry = pending.get(key(target, original.message_id));
            if (!entry || !original.text.startsWith(`${entry.marker}\n`) ||
                !current(entry.event, entry.target, entry.transportStamp, entry.authority, ctx) ||
                entry.sessionId !== deps.getSessionId(ctx) || !sameTarget(entry.target, target))
                return true;
            if (typeof message.text !== "string")
                return true;
            const answer = decodeAnswer(entry.event, message.text);
            if (answer.valid)
                entry.settle({ action: "handled", value: answer.value });
            return true;
        },
    };
}
