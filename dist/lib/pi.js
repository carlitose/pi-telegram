/**
 * pi SDK adapter boundary
 * Zones: pi agent sdk boundary, shared adapters
 * Owns direct pi SDK imports and exposes narrow bridge-facing helpers/types for the extension composition layer
 */
import { SettingsManager, } from "@earendil-works/pi-coding-agent";
export function registerPiRemoteDialogResponder(pi, handler) {
    const register = pi.on.bind(pi);
    register("ui_prompt_request", handler);
}
// pi-code owns this versioned in-process event. Keep the structural view at the
// Pi boundary instead of importing a second extension's package-private source.
export const PI_CODE_QUESTION_CHANNEL = "pi-code:question:v1";
function isPiCodeQuestionOffer(value) {
    if (!value || typeof value !== "object")
        return false;
    const offer = value;
    const signal = offer.signal;
    return offer.version === 1 && typeof offer.requestId === "string" &&
        /^[A-Za-z0-9-]{1,64}$/.test(offer.requestId) &&
        typeof offer.sessionId === "string" && offer.sessionId.length > 0 &&
        typeof offer.question === "string" && (offer.header === undefined || typeof offer.header === "string") &&
        Array.isArray(offer.options) && offer.options.length >= 2 && offer.options.length <= 4 &&
        offer.options.every((option) => !!option && typeof option === "object" &&
            typeof option.label === "string" &&
            (option.description === undefined || typeof option.description === "string")) &&
        typeof offer.multiSelect === "boolean" && offer.allowFreeText === !offer.multiSelect &&
        typeof signal?.aborted === "boolean" && typeof signal.addEventListener === "function" &&
        typeof signal.removeEventListener === "function" && typeof offer.claim === "function" &&
        typeof offer.touch === "function";
}
export function registerPiCodeQuestionResponder(pi, getContext, handler) {
    pi.events?.on(PI_CODE_QUESTION_CHANNEL, (data) => {
        if (!isPiCodeQuestionOffer(data))
            return;
        const ctx = getContext();
        if (ctx)
            handler(data, ctx);
    });
}
function isPiRunMode(value) {
    return (value === "tui" || value === "rpc" || value === "json" || value === "print");
}
export function getExtensionContextMode(ctx) {
    const mode = typeof ctx === "object" && ctx !== null
        ? ctx.mode
        : undefined;
    return isPiRunMode(mode) ? mode : undefined;
}
export function isExtensionContextPassiveRunMode(ctx) {
    const mode = getExtensionContextMode(ctx);
    return mode === "print" || mode === "json";
}
export function canStartPollingInExtensionContext(ctx) {
    return !isExtensionContextPassiveRunMode(ctx);
}
export function formatPollingStartBlockedByRunMode(ctx) {
    const mode = getExtensionContextMode(ctx);
    return mode
        ? `Telegram polling is unavailable in Pi ${mode} mode. Use /telegram-connect from a long-lived Pi session.`
        : "Telegram polling is unavailable in this Pi run mode.";
}
export function getSessionCompactionReason(event) {
    const reason = event && typeof event === "object" && "reason" in event
        ? event.reason
        : undefined;
    return reason === "manual" || reason === "threshold" || reason === "overflow"
        ? reason
        : "unknown";
}
export function createExtensionApiRuntimePorts(api) {
    return {
        sendUserMessage: (content, options) => api.sendUserMessage(content, options),
        exec: (command, args, options) => api.exec(command, args, options),
        getCommands: () => api.getCommands(),
        getThinkingLevel: () => api.getThinkingLevel(),
        setThinkingLevel: (level) => api.setThinkingLevel(level),
        getActiveTools: () => api.getActiveTools(),
        setActiveTools: (names) => api.setActiveTools(names),
        setModel: (model) => api.setModel(model),
        registerCommand: (name, options) => api.registerCommand(name, options),
    };
}
function readEnabledModels(value) {
    if (value === undefined)
        return undefined;
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
        return [...value];
    }
    throw new TypeError("Host settings enabledModels must be a string array or undefined.");
}
export function normalizeSettingsManager(manager) {
    if (typeof manager !== "object" || manager === null) {
        throw new TypeError("Host settings manager must be an object.");
    }
    const host = manager;
    if (typeof host.flush !== "function") {
        throw new TypeError("Host settings manager must provide flush().");
    }
    const read = typeof host.getEnabledModels === "function"
        ? () => host.getEnabledModels.call(host)
        : typeof host.get === "function"
            ? () => host.get.call(host, "enabledModels")
            : undefined;
    const write = typeof host.setEnabledModels === "function"
        ? (patterns) => host.setEnabledModels.call(host, patterns)
        : typeof host.set === "function"
            ? (patterns) => host.set.call(host, "enabledModels", patterns ?? [])
            : undefined;
    if (!read || !write) {
        throw new TypeError("Host settings manager must provide enabled-model read and write capabilities.");
    }
    return {
        reload: async () => {
            await host.reload?.call(host);
        },
        flush: async () => {
            await host.flush.call(host);
        },
        getEnabledModels: () => readEnabledModels(read()),
        setEnabledModels: write,
    };
}
export async function createSettingsManager(cwd) {
    // Pi returns its legacy settings surface synchronously. Compatible hosts may
    // resolve a generic settings service asynchronously; normalize both once at
    // the SDK boundary instead of leaking host distinctions into menu domains.
    const factory = SettingsManager;
    return normalizeSettingsManager(await factory.create(cwd));
}
export function createScopedModelPatternPersister(deps) {
    return async (patterns, ctx) => {
        const settingsManager = await deps.createSettingsManager(ctx.cwd);
        settingsManager.setEnabledModels(patterns.length > 0 ? patterns : undefined);
        await settingsManager.flush();
        deps.clearCachedModelMenuInputs();
    };
}
export function getExtensionContextModel(ctx) {
    return ctx.model;
}
export function getExtensionContextCwd(ctx) {
    return ctx.cwd;
}
export function getExtensionContextSessionId(ctx) {
    return ctx.sessionManager.getSessionId();
}
export function isExtensionContextIdle(ctx) {
    return ctx.isIdle();
}
export function hasExtensionContextPendingMessages(ctx) {
    return ctx.hasPendingMessages();
}
export function compactExtensionContext(ctx, callbacks) {
    return ctx.compact(callbacks);
}
