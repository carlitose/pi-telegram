/**
 * Pi session command bridge
 * Zones: pi agent commands, telegram controls, filesystem
 * Owns fresh command plans, bounded catalog projection, resource expansion, and SDK submission.
 * Excludes authorization, durable custody, queue policy, transport, and TUI emulation.
 */
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { TELEGRAM_INTERNAL_COMMAND_NAME } from "./commands.js";
import { stripFrontmatter } from "./pi.js";
import { expandTelegramPromptTemplateCommand } from "./prompt-templates.js";
import { escapeHtml } from "./rendering.js";
function availableCommands(commands) {
    const seen = new Set();
    return commands.filter(command => {
        if (command.name === TELEGRAM_INTERNAL_COMMAND_NAME ||
            !command.name || /[\s\x00-\x1f\x7f]/u.test(command.name) ||
            !["extension", "prompt", "skill"].includes(command.source) || seen.has(command.name))
            return false;
        seen.add(command.name);
        return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
}
const unavailable = () => ({
    kind: "reply", html: "<b>⚠️ Pi command is unavailable.</b>\nUse /pi for this session’s commands; TUI-only commands are not exposed by Pi’s command catalog.",
});
function displayCommandName(name) {
    const characters = Array.from(name);
    return characters.length > 256 ? `${characters.slice(0, 256).join("")}…` : name;
}
function catalogReply(commands, page) {
    const pages = [[]];
    for (const command of commands) {
        const description = command.description &&
            Array.from(command.description.replace(/\s+/g, " ")).slice(0, 100).join("");
        const label = displayCommandName(command.name);
        const row = `<code>/pi ${escapeHtml(label)}</code> (${command.source})${label !== command.name ? " — name shortened; invoke the full SDK name" : ""}${description ? ` — ${escapeHtml(description)}` : ""}`;
        let current = pages[pages.length - 1];
        if (current.length >= 12 || current.join("\n").length + row.length > 2800) {
            current = [];
            pages.push(current);
        }
        current.push(row);
    }
    if (!Number.isSafeInteger(page) || page < 1 || page > pages.length) {
        return { kind: "reply", html: "<b>⚠️ Pi command page is unavailable.</b>\nUse /pi to refresh the catalog." };
    }
    return { kind: "reply", html: [
            `<b>⌨️ Pi commands (${page}/${pages.length}):</b>`,
            pages[page - 1].join("\n") || "No public session commands are currently loaded.",
            ...(page < pages.length ? [`Next: <code>/pi --page ${page + 1}</code>.`] : []),
            "Invoke: <code>/pi name arguments</code>. Names are exact; an optional leading slash is accepted.",
            "Reload loaded resources: <code>/pi --reload</code>. This does not install packages or update Pi.",
            "TUI-only commands are not included; existing Telegram controls still apply.",
        ].join("\n") };
}
export function planTelegramPiCommand(args, commands, readResource = path => readFileSync(path, "utf-8")) {
    const catalog = availableCommands(commands);
    const input = args.trimStart();
    if (!input.trim())
        return catalogReply(catalog, 1);
    if (/^--page(?:\s|$)/.test(input)) {
        const page = /^--page\s+(\d+)\s*$/.exec(input);
        return catalogReply(catalog, page ? Number(page[1]) : NaN);
    }
    if (input.trim() === "--reload")
        return { kind: "invoke", request: { kind: "reload" } };
    const match = /^\/?([^\s]+)(?:[ \t]+([\s\S]*))?$/.exec(input);
    const command = catalog.find(candidate => candidate.name === match?.[1]);
    if (!command)
        return unavailable();
    const commandArgs = match?.[2] ?? "";
    if (command.source === "extension") {
        return { kind: "invoke", request: {
                kind: "extension", name: command.name, args: commandArgs,
                ...(command.sourceInfo?.path ? { sourcePath: command.sourceInfo.path } : {}),
            } };
    }
    const path = command.sourceInfo?.path;
    if (!path)
        return unavailable();
    if (command.source === "prompt") {
        const text = expandTelegramPromptTemplateCommand(command.name, commandArgs, [{ command: command.name, path }], readResource);
        return text === undefined ? unavailable() : { kind: "prompt", text };
    }
    const name = command.name.startsWith("skill:") ? command.name.slice(6) : command.name;
    const body = stripFrontmatter(readResource(path)).trim();
    const block = `<skill name="${name}" location="${path}">\nReferences are relative to ${dirname(path)}.\n\n${body}\n</skill>`;
    return { kind: "prompt", text: commandArgs ? `${block}\n\n${commandArgs}` : block };
}
export async function executeTelegramPiCommand(request, deps) {
    if (!deps.isCurrent())
        return;
    if (request.kind === "reload") {
        await deps.reply("<b>⌨️ Pi resource reload requested.</b>");
        if (deps.isCurrent())
            await deps.ctx.reload();
        return;
    }
    const stillAvailable = () => availableCommands(deps.getCommands()).some(command => command.source === "extension" && command.name === request.name &&
        command.sourceInfo?.path === request.sourcePath);
    if (!stillAvailable()) {
        await deps.reply("<b>⚠️ Pi command is no longer available.</b>");
        return;
    }
    await deps.reply(`<b>⌨️ Pi command <code>/${escapeHtml(displayCommandName(request.name))}</code> requested.</b>`);
    if (!deps.isCurrent())
        return;
    if (!stillAvailable()) {
        await deps.reply("<b>⚠️ Pi command is no longer available.</b>");
        return;
    }
    deps.sendUserMessage(`/${request.name}${request.args ? ` ${request.args}` : ""}`, { expandPromptTemplates: true });
}
