/**
 * Read-only terminal projection of assistant-authored Telegram controls.
 * Zones: tui, pi agent
 * Owns presentation through the public Markdown transformer; excludes input,
 * callback authority, widgets, transport, queue and persisted session state.
 */
import { stripVTControlCharacters } from "node:util";
import * as Controls from "./controls.js";
function displayLabel(label) {
    const text = stripVTControlCharacters(label)
        .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, " ")
        .trim() || "—";
    return text.replace(/[\\`*_{}\[\]<>]/gu, "\\$&");
}
export function registerTelegramTranscript(pi) {
    if (typeof pi.registerMarkdownTransformer !== "function")
        return;
    pi.registerMarkdownTransformer((raw, context) => {
        if (context.messageType !== "assistant")
            return raw;
        const projection = Controls.projectAssistantPromptControls(raw);
        if (!projection.rows.length)
            return raw;
        const choices = projection.rows.flat().map((cell, index) => `${index + 1}. ${displayLabel(cell.label)}${cell.disabled ? ` (unavailable: ${cell.unavailableReason})` : ""}`);
        return [projection.markdown, choices.join("\n"), "Reply normally with the number or text of your choice."]
            .filter(Boolean).join("\n\n");
    });
}
