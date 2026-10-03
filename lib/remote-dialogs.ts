/**
 * Remote Pi dialog bridge
 * Zones: telegram, pi agent
 * Owns one-shot, exact-target replies for host dialogs and typed pi-code questions.
 */

import { randomBytes } from "node:crypto";
import type { PiCodeQuestionOffer, PiCodeQuestionOutcome, PiRemoteDialogRequest, PiRemoteDialogResponse } from "./pi.ts";
import type { TelegramTransportStamp } from "./queue.ts";
import type { TelegramSendMessageBody, TelegramSentMessage } from "./telegram-api.ts";
import type { TelegramTarget } from "./target.ts";

export interface TelegramRemoteDialogReply {
  chat: { id?: number };
  from?: { id?: number };
  message_thread_id?: number;
  text?: string;
  reply_to_message?: {
    message_id?: number;
    text?: string;
    from?: { id?: number };
  };
}

export interface TelegramRemoteQuestionCallback {
  data?: string;
  from?: { id?: number };
  message?: TelegramRemoteDialogReply & { message_id?: number };
}

function sameTarget(a: TelegramTarget, b: TelegramTarget): boolean {
  return a.chatId === b.chatId && a.threadId === b.threadId;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function renderDialog(event: PiRemoteDialogRequest): string | undefined {
  const marker = `Pi dialog [${event.requestId}]`;
  const heading = `<b>${escapeHtml(event.title)}</b>`;
  let details: string;
  switch (event.kind) {
    case "select":
      if (event.options.length === 0 || event.options.length > 32) return undefined;
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

function decodeAnswer(event: PiRemoteDialogRequest, text: string): { valid: boolean; value?: string | boolean } {
  const normalized = text.trim().toLowerCase();
  if (normalized === "/cancel") return { valid: true, value: event.kind === "confirm" ? false : undefined };
  if (event.kind === "select") {
    const choice = Number(text.trim());
    if (!/^\d+$/.test(text.trim()) || choice < 1 || choice > event.options.length) return { valid: false };
    return { valid: true, value: event.options[choice - 1] };
  }
  if (event.kind === "confirm") {
    if (["yes", "y", "si", "sì", "true"].includes(normalized)) return { valid: true, value: true };
    if (["no", "n", "false"].includes(normalized)) return { valid: true, value: false };
    return { valid: false };
  }
  return { valid: text.length > 0, value: text };
}

function renderQuestion(event: PiCodeQuestionOffer): string | undefined {
  const marker = `Pi question [${event.requestId}]`;
  const heading = `<b>${escapeHtml(event.header ? `[${event.header}] ${event.question}` : event.question)}</b>`;
  const options = event.options.map((option, index) =>
    `${index + 1}. ${escapeHtml(option.label)}${option.description ? ` — ${escapeHtml(option.description)}` : ""}`).join("\n");
  const instructions = event.multiSelect
    ? "Reply to this message with comma-separated option numbers (e.g. 1,2), none, or /cancel."
    : "Tap a choice below. For your own text, use Reply on this exact message (/text 2 for numeric text). A plain Thread message does not answer this question.";
  const text = `${marker}\n${heading}\n${options}\n${instructions}`;
  return event.options.length >= 2 && event.options.length <= 4 && text.length <= 4096 ? text : undefined;
}

function decodeQuestion(event: PiCodeQuestionOffer, text: string): PiCodeQuestionOutcome | undefined {
  const input = text.trim();
  if (input.toLowerCase() === "/cancel") return { action: "cancel" };
  if (event.multiSelect) {
    if (input.toLowerCase() === "none") return { action: "answer", indices: [] };
    if (!/^\d+(?:\s*,\s*\d+)*$/.test(input)) return undefined;
    const indices = input.split(",").map((part) => Number(part.trim()));
    if (new Set(indices).size !== indices.length || indices.some((index) => !Number.isSafeInteger(index) || index < 1 || index > event.options.length)) return undefined;
    return { action: "answer", indices };
  }
  if (/^\/text\s+/i.test(input)) {
    const answer = input.replace(/^\/text\s+/i, "").trim();
    return answer ? { action: "text", text: answer } : undefined;
  }
  if (input.startsWith("/")) return undefined;
  if (/^\d+$/.test(input)) {
    const index = Number(input);
    return Number.isSafeInteger(index) && index >= 1 && index <= event.options.length
      ? { action: "answer", indices: [index] } : undefined;
  }
  // A comma-separated selection in single-select mode is not accidental free text.
  if (!input || /^[\d,\s]+$/.test(input)) return undefined;
  return { action: "text", text: input };
}

interface PendingDialog {
  event: PiRemoteDialogRequest;
  target: TelegramTarget;
  marker: string;
  sessionId: string;
  transportStamp: TelegramTransportStamp;
  authority: string;
  settle: (response: PiRemoteDialogResponse) => void;
}

interface PendingQuestion {
  event: PiCodeQuestionOffer;
  target: TelegramTarget;
  marker: string;
  sessionId: string;
  transportStamp: TelegramTransportStamp;
  authority: string;
  callbackToken?: string;
  settle: (outcome: PiCodeQuestionOutcome) => boolean;
}

export function createTelegramRemoteDialogRuntime<TContext>(deps: {
  getTarget(): TelegramTarget | undefined;
  getAllowedUserId(): number | undefined;
  getBotId(): number | undefined;
  getTransportStamp(): TelegramTransportStamp;
  isTransportStampActive(stamp: TelegramTransportStamp): boolean;
  getAuthorityKey(): string | undefined;
  isCurrent(ctx: TContext): boolean;
  getSessionId(ctx: TContext): string;
  sendMessage(body: TelegramSendMessageBody): Promise<TelegramSentMessage>;
  recordMessageOwnership(record: { chatId: number; messageId: number; target: TelegramTarget }): void;
  recordError(error: unknown): void;
}): {
  offer(event: PiRemoteDialogRequest, ctx: TContext): Promise<PiRemoteDialogResponse>;
  offerQuestion(event: PiCodeQuestionOffer, ctx: TContext): boolean;
  consume(message: TelegramRemoteDialogReply, ctx: TContext): boolean;
  /** Synchronous settlement precedes the caller's best-effort callback acknowledgement. */
  consumeCallback(query: TelegramRemoteQuestionCallback, ctx: TContext): string | undefined;
} {
  const pending = new Map<string, PendingDialog>();
  const pendingQuestions = new Map<string, PendingQuestion>();
  const key = (target: TelegramTarget, messageId: number) =>
    `${target.chatId}:${target.threadId ?? "all"}:${messageId}`;
  const current = (
    event: { signal: AbortSignal; sessionId: string }, target: TelegramTarget, stamp: TelegramTransportStamp,
    authority: string, ctx: TContext,
  ) => {
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
          !authority || !current(event, target, stamp, authority, ctx)) return { action: "pass" };
      const text = renderDialog(event);
      if (!text) return { action: "pass" };
      try {
        const sent = await deps.sendMessage({
          chat_id: target.chatId,
          ...(target.threadId !== undefined ? { message_thread_id: target.threadId } : {}),
          text, parse_mode: "HTML", link_preview_options: { is_disabled: true },
          disable_notification: false,
        });
        if (!Number.isSafeInteger(sent.message_id) || sent.message_id <= 0 ||
            !current(event, target, stamp, authority, ctx)) return { action: "pass" };
        deps.recordMessageOwnership({ chatId: target.chatId, messageId: sent.message_id, target });
        const messageKey = key(target, sent.message_id);
        if (pending.has(messageKey)) return { action: "pass" };
        return await new Promise<PiRemoteDialogResponse>((resolve) => {
          const onAbort = () => finish({ action: "pass" });
          const entry: PendingDialog = {
            event, target, marker: `Pi dialog [${event.requestId}]`,
            sessionId: event.sessionId, transportStamp: stamp, authority, settle: finish,
          };
          function finish(result: PiRemoteDialogResponse): void {
            if (pending.get(messageKey) !== entry) return;
            pending.delete(messageKey);
            event.signal.removeEventListener("abort", onAbort);
            resolve(result);
          }
          pending.set(messageKey, entry);
          event.signal.addEventListener("abort", onAbort, { once: true });
          if (event.signal.aborted) onAbort();
        });
      } catch (error) {
        deps.recordError(error);
        return { action: "pass" };
      }
    },
    offerQuestion(event, ctx) {
      const target = deps.getTarget();
      const owner = deps.getAllowedUserId();
      const stamp = deps.getTransportStamp();
      const authority = deps.getAuthorityKey();
      if (!target || !owner || target.chatId !== owner || !deps.getBotId() ||
          !authority || !current(event, target, stamp, authority, ctx)) return false;
      const text = renderQuestion(event);
      if (!text) return false;
      const settle = event.claim();
      if (typeof settle !== "function") return false;
      const settleQuestion: (outcome: PiCodeQuestionOutcome) => boolean = settle;
      const callbackToken = event.multiSelect ? undefined : randomBytes(12).toString("hex");

      // Claim before yielding to transport; a failed/uncertain send releases the
      // producer to its local overlay without retrying the Telegram mutation.
      void (async () => {
        try {
          const sent = await deps.sendMessage({
            chat_id: target.chatId,
            ...(target.threadId !== undefined ? { message_thread_id: target.threadId } : {}),
            text, parse_mode: "HTML", link_preview_options: { is_disabled: true },
            disable_notification: false,
            // Buttons identify their own message rather than a Thread service message.
            reply_markup: callbackToken ? {
              inline_keyboard: [
                ...event.options.map((option, index) => [{
                  text: `${index + 1}. ${Array.from(option.label).slice(0, 48).join("")}`,
                  callback_data: `question:${callbackToken}:${index + 1}`,
                }]),
                [{ text: "❌ Cancel", callback_data: `question:${callbackToken}:cancel` }],
              ],
            } : {
              force_reply: true,
              input_field_placeholder: "Reply to this question: e.g. 1,2 or /cancel",
            },
          });
          if (!Number.isSafeInteger(sent.message_id) || sent.message_id <= 0 ||
              !current(event, target, stamp, authority, ctx)) {
            settle({ action: "pass" });
            return;
          }
          deps.recordMessageOwnership({ chatId: target.chatId, messageId: sent.message_id, target });
          const messageKey = key(target, sent.message_id);
          if (pending.has(messageKey) || pendingQuestions.has(messageKey)) {
            settle({ action: "pass" });
            return;
          }
          const onAbort = () => finish({ action: "pass" });
          const entry: PendingQuestion = {
            event, target, marker: `Pi question [${event.requestId}]`,
            sessionId: event.sessionId, transportStamp: stamp, authority, callbackToken, settle: finish,
          };
          function finish(outcome: PiCodeQuestionOutcome): boolean {
            if (pendingQuestions.get(messageKey) !== entry) return false;
            pendingQuestions.delete(messageKey);
            event.signal.removeEventListener("abort", onAbort);
            return settleQuestion(outcome);
          }
          pendingQuestions.set(messageKey, entry);
          event.signal.addEventListener("abort", onAbort, { once: true });
          if (event.signal.aborted) onAbort();
        } catch (error) {
          deps.recordError(error);
          settle({ action: "pass" });
        }
      })();
      return true;
    },
    consumeCallback(query, ctx) {
      if (!query.data?.startsWith("question:")) return undefined;
      const unavailable = "🚫 Question no longer available.";
      const match = /^question:([a-f0-9]{24}):([1-4]|cancel)$/.exec(query.data);
      const message = query.message;
      const owner = deps.getAllowedUserId();
      const botId = deps.getBotId();
      if (!match || !message || !owner || !botId || query.from?.id !== owner ||
          message.from?.id !== botId || typeof message.chat.id !== "number" ||
          typeof message.message_id !== "number") return unavailable;
      const target: TelegramTarget = {
        chatId: message.chat.id,
        ...(typeof message.message_thread_id === "number" ? { threadId: message.message_thread_id } : {}),
      };
      const question = pendingQuestions.get(key(target, message.message_id));
      if (!question || question.callbackToken !== match[1] || question.event.multiSelect ||
          !current(question.event, question.target, question.transportStamp, question.authority, ctx)) return unavailable;
      const action = match[2];
      const index = Number(action);
      if (action !== "cancel" && index > question.event.options.length) return unavailable;
      question.event.touch();
      const accepted = question.settle(action === "cancel"
        ? { action: "cancel" } : { action: "answer", indices: [index] });
      return !accepted ? unavailable : action === "cancel" ? "🚫 Question cancelled." : "✅ Answer recorded.";
    },
    consume(message, ctx) {
      const original = message.reply_to_message;
      const botId = deps.getBotId();
      const owner = deps.getAllowedUserId();
      const isDialog = original?.text?.startsWith("Pi dialog [") && original.text.includes("]\n");
      const isQuestion = original?.text?.startsWith("Pi question [") && original.text.includes("]\n");
      if (!botId || original?.from?.id !== botId || (!isDialog && !isQuestion) ||
          message.from?.id !== owner || typeof message.chat.id !== "number") return false;
      if (typeof original.message_id !== "number") return true;
      const target: TelegramTarget = {
        chatId: message.chat.id,
        ...(typeof message.message_thread_id === "number" ? { threadId: message.message_thread_id } : {}),
      };
      const messageKey = key(target, original.message_id);
      if (isQuestion) {
        const question = pendingQuestions.get(messageKey);
        if (!question || !original.text?.startsWith(`${question.marker}\n`) ||
            !current(question.event, question.target, question.transportStamp, question.authority, ctx) ||
            question.sessionId !== deps.getSessionId(ctx) || !sameTarget(question.target, target)) return true;
        if (typeof message.text !== "string") return true;
        const input = message.text.trim();
        if (input.startsWith("/") && input.toLowerCase() !== "/cancel" &&
            !/^\/text(?:\s|$)/i.test(input)) return false;
        const answer = decodeQuestion(question.event, message.text);
        question.event.touch();
        if (answer) question.settle(answer);
        return true;
      }
      const entry = pending.get(messageKey);
      if (!entry || !original.text?.startsWith(`${entry.marker}\n`) ||
          !current(entry.event, entry.target, entry.transportStamp, entry.authority, ctx) ||
          entry.sessionId !== deps.getSessionId(ctx) || !sameTarget(entry.target, target)) return true;
      if (typeof message.text !== "string") return true;
      const answer = decodeAnswer(entry.event, message.text);
      if (answer.valid) entry.settle({ action: "handled", value: answer.value });
      return true;
    },
  };
}
