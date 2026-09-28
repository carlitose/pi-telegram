/**
 * pi SDK adapter boundary
 * Zones: pi agent sdk boundary, shared adapters
 * Owns direct pi SDK imports and exposes narrow bridge-facing helpers/types for the extension composition layer
 */

import type { AssistantMessageEvent } from "@earendil-works/pi-ai";
import {
  type AgentEndEvent,
  type AgentSettledEvent,
  type AgentStartEvent,
  type BeforeAgentStartEvent,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
  type InputEvent,
  type MessageEndEvent,
  type SessionBeforeCompactEvent,
  type SessionCompactEvent,
  type SessionShutdownEvent,
  type SessionStartEvent,
  type SlashCommandInfo,
  type UIPromptEndEvent,
  type UIPromptStartEvent,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

export type {
  AgentEndEvent,
  AgentSettledEvent,
  AgentStartEvent,
  AssistantMessageEvent,
  BeforeAgentStartEvent,
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  InputEvent,
  MessageEndEvent,
  SessionBeforeCompactEvent,
  SessionCompactEvent,
  SessionShutdownEvent,
  SessionStartEvent,
  SlashCommandInfo,
  UIPromptEndEvent,
  UIPromptStartEvent,
};

// Structural view of the proposed host ui_prompt_request event. Keep this adapter
// until the host PR is released; the installed peer does not export its types yet.
export type PiRemoteDialogRequest = {
  type: "ui_prompt_request";
  requestId: string;
  sessionId: string;
  signal: AbortSignal;
  title: string;
} & (
  | { kind: "select"; options: string[] }
  | { kind: "confirm"; message: string }
  | { kind: "input"; placeholder?: string }
  | { kind: "editor"; prefill?: string }
);

export type PiRemoteDialogResponse =
  | { action: "pass" }
  | { action: "handled"; value: string | boolean | undefined };

export function registerPiRemoteDialogResponder(
  pi: ExtensionAPI,
  handler: (event: PiRemoteDialogRequest, ctx: ExtensionContext) => Promise<PiRemoteDialogResponse>,
): void {
  const register = pi.on.bind(pi) as unknown as (
    event: "ui_prompt_request",
    handler: (event: PiRemoteDialogRequest, ctx: ExtensionContext) => Promise<PiRemoteDialogResponse>,
  ) => void;
  register("ui_prompt_request", handler);
}

// pi-code owns this versioned in-process event. Keep the structural view at the
// Pi boundary instead of importing a second extension's package-private source.
export const PI_CODE_QUESTION_CHANNEL = "pi-code:question:v1";
export type PiCodeQuestionOutcome =
  | { action: "answer"; indices: number[] }
  | { action: "text"; text: string }
  | { action: "cancel" }
  | { action: "pass" };

export interface PiCodeQuestionOffer {
  version: 1;
  requestId: string;
  sessionId: string;
  question: string;
  header?: string;
  options: Array<{ label: string; description?: string }>;
  multiSelect: boolean;
  allowFreeText: boolean;
  signal: AbortSignal;
  claim(): ((outcome: PiCodeQuestionOutcome) => boolean) | undefined;
  touch(): boolean;
}

function isPiCodeQuestionOffer(value: unknown): value is PiCodeQuestionOffer {
  if (!value || typeof value !== "object") return false;
  const offer = value as Record<string, unknown>;
  const signal = offer.signal as Partial<AbortSignal> | undefined;
  return offer.version === 1 && typeof offer.requestId === "string" &&
    /^[A-Za-z0-9-]{1,64}$/.test(offer.requestId) &&
    typeof offer.sessionId === "string" && offer.sessionId.length > 0 &&
    typeof offer.question === "string" && (offer.header === undefined || typeof offer.header === "string") &&
    Array.isArray(offer.options) && offer.options.length >= 2 && offer.options.length <= 4 &&
    offer.options.every((option: unknown) => !!option && typeof option === "object" &&
      typeof (option as { label?: unknown }).label === "string" &&
      ((option as { description?: unknown }).description === undefined || typeof (option as { description?: unknown }).description === "string")) &&
    typeof offer.multiSelect === "boolean" && offer.allowFreeText === !offer.multiSelect &&
    typeof signal?.aborted === "boolean" && typeof signal.addEventListener === "function" &&
    typeof signal.removeEventListener === "function" && typeof offer.claim === "function" &&
    typeof offer.touch === "function";
}

export function registerPiCodeQuestionResponder(
  pi: ExtensionAPI,
  getContext: () => ExtensionContext | undefined,
  handler: (offer: PiCodeQuestionOffer, ctx: ExtensionContext) => void,
): void {
  pi.events?.on(PI_CODE_QUESTION_CHANNEL, (data) => {
    if (!isPiCodeQuestionOffer(data)) return;
    const ctx = getContext();
    if (ctx) handler(data, ctx);
  });
}

export interface SessionCompactFailedEvent {
  type: "session_compact_failed";
  reason: "manual" | "threshold" | "overflow";
  errorMessage?: string;
  aborted: boolean;
  willRetry: boolean;
  fromExtension: boolean;
}

export interface ToolExecutionStartEvent {
  type: "tool_execution_start";
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface ToolExecutionUpdateEvent {
  type: "tool_execution_update";
  toolCallId: string;
  toolName: string;
  args: unknown;
  partialResult: unknown;
}

export interface ToolExecutionEndEvent {
  type: "tool_execution_end";
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError: boolean;
}

export interface PiSettingsManager {
  reload: () => Promise<void>;
  flush: () => Promise<void>;
  getEnabledModels: () => string[] | undefined;
  setEnabledModels: (patterns: string[] | undefined) => void;
}

export type PiSlashCommandInfo = SlashCommandInfo;
export type PiRunMode = "tui" | "rpc" | "json" | "print";

function isPiRunMode(value: unknown): value is PiRunMode {
  return (
    value === "tui" || value === "rpc" || value === "json" || value === "print"
  );
}

export function getExtensionContextMode(ctx: unknown): PiRunMode | undefined {
  const mode =
    typeof ctx === "object" && ctx !== null
      ? (ctx as { mode?: unknown }).mode
      : undefined;
  return isPiRunMode(mode) ? mode : undefined;
}

export function isExtensionContextPassiveRunMode(ctx: unknown): boolean {
  const mode = getExtensionContextMode(ctx);
  return mode === "print" || mode === "json";
}

export function canStartPollingInExtensionContext(ctx: unknown): boolean {
  return !isExtensionContextPassiveRunMode(ctx);
}

export function formatPollingStartBlockedByRunMode(ctx: unknown): string {
  const mode = getExtensionContextMode(ctx);
  return mode
    ? `Telegram polling is unavailable in Pi ${mode} mode. Use /telegram-connect from a long-lived Pi session.`
    : "Telegram polling is unavailable in this Pi run mode.";
}

export function getSessionCompactionReason(
  event: unknown,
): "manual" | "threshold" | "overflow" | "unknown" {
  const reason =
    event && typeof event === "object" && "reason" in event
      ? (event as { reason?: unknown }).reason
      : undefined;
  return reason === "manual" || reason === "threshold" || reason === "overflow"
    ? reason
    : "unknown";
}

export interface PiExtensionApiRuntimePorts {
  sendUserMessage: ExtensionAPI["sendUserMessage"];
  exec: ExtensionAPI["exec"];
  getCommands: ExtensionAPI["getCommands"];
  getThinkingLevel: ExtensionAPI["getThinkingLevel"];
  setThinkingLevel: ExtensionAPI["setThinkingLevel"];
  getActiveTools: ExtensionAPI["getActiveTools"];
  setActiveTools: ExtensionAPI["setActiveTools"];
  setModel: ExtensionAPI["setModel"];
  registerCommand: ExtensionAPI["registerCommand"];
}

export function createExtensionApiRuntimePorts(
  api: Pick<
    ExtensionAPI,
    | "sendUserMessage"
    | "exec"
    | "getCommands"
    | "getThinkingLevel"
    | "setThinkingLevel"
    | "getActiveTools"
    | "setActiveTools"
    | "setModel"
    | "registerCommand"
  >,
): PiExtensionApiRuntimePorts {
  return {
    sendUserMessage: (content, options) =>
      api.sendUserMessage(content, options),
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

type PiSettingsManagerFactory = {
  create: (cwd: string) => unknown | PromiseLike<unknown>;
};

type HostSettingsManager = {
  reload?: () => void | PromiseLike<void>;
  flush?: () => void | PromiseLike<void>;
  getEnabledModels?: () => unknown;
  setEnabledModels?: (patterns: string[] | undefined) => void;
  get?: (key: string) => unknown;
  set?: (key: string, value: unknown) => void;
};

function readEnabledModels(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return [...value];
  }
  throw new TypeError("Host settings enabledModels must be a string array or undefined.");
}

export function normalizeSettingsManager(manager: unknown): PiSettingsManager {
  if (typeof manager !== "object" || manager === null) {
    throw new TypeError("Host settings manager must be an object.");
  }
  const host = manager as HostSettingsManager;
  if (typeof host.flush !== "function") {
    throw new TypeError("Host settings manager must provide flush().");
  }
  const read = typeof host.getEnabledModels === "function"
    ? () => host.getEnabledModels!.call(host)
    : typeof host.get === "function"
      ? () => host.get!.call(host, "enabledModels")
      : undefined;
  const write = typeof host.setEnabledModels === "function"
    ? (patterns: string[] | undefined) =>
        host.setEnabledModels!.call(host, patterns)
    : typeof host.set === "function"
      ? (patterns: string[] | undefined) =>
          host.set!.call(host, "enabledModels", patterns ?? [])
      : undefined;
  if (!read || !write) {
    throw new TypeError(
      "Host settings manager must provide enabled-model read and write capabilities.",
    );
  }
  return {
    reload: async () => {
      await host.reload?.call(host);
    },
    flush: async () => {
      await host.flush!.call(host);
    },
    getEnabledModels: () => readEnabledModels(read()),
    setEnabledModels: write,
  };
}

export async function createSettingsManager(
  cwd: string,
): Promise<PiSettingsManager> {
  // Pi returns its legacy settings surface synchronously. Compatible hosts may
  // resolve a generic settings service asynchronously; normalize both once at
  // the SDK boundary instead of leaking host distinctions into menu domains.
  const factory = SettingsManager as unknown as PiSettingsManagerFactory;
  return normalizeSettingsManager(await factory.create(cwd));
}

export function createScopedModelPatternPersister(deps: {
  createSettingsManager: (
    cwd: string,
  ) => PiSettingsManager | PromiseLike<PiSettingsManager>;
  clearCachedModelMenuInputs: () => void;
}): (patterns: string[], ctx: ExtensionContext) => Promise<void> {
  return async (patterns, ctx) => {
    const settingsManager = await deps.createSettingsManager(ctx.cwd);
    settingsManager.setEnabledModels(
      patterns.length > 0 ? patterns : undefined,
    );
    await settingsManager.flush();
    deps.clearCachedModelMenuInputs();
  };
}

export function getExtensionContextModel(
  ctx: ExtensionContext,
): ExtensionContext["model"] {
  return ctx.model;
}

export function getExtensionContextCwd(ctx: ExtensionContext): string {
  return ctx.cwd;
}

export function getExtensionContextSessionId(ctx: ExtensionContext): string {
  return ctx.sessionManager.getSessionId();
}

export function isExtensionContextIdle(ctx: ExtensionContext): boolean {
  return ctx.isIdle();
}

export function hasExtensionContextPendingMessages(
  ctx: ExtensionContext,
): boolean {
  return ctx.hasPendingMessages();
}

export function compactExtensionContext(
  ctx: ExtensionContext,
  callbacks: Parameters<ExtensionContext["compact"]>[0],
): ReturnType<ExtensionContext["compact"]> {
  return ctx.compact(callbacks);
}
