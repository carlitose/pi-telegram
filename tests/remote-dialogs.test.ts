/**
 * Regression tests for Telegram remote Pi dialogs
 * Covers exact target and transport authority, typed replies, cancellation, and delivery fallback.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { createEventBus } from "@earendil-works/pi-coding-agent";
import { PI_CODE_QUESTION_CHANNEL, registerPiCodeQuestionResponder, type ExtensionAPI, type ExtensionContext, type PiCodeQuestionOffer, type PiCodeQuestionOutcome, type PiRemoteDialogRequest } from "../lib/pi.ts";
import { createTelegramRemoteDialogRuntime } from "../lib/remote-dialogs.ts";
import type { TelegramSendMessageBody } from "../lib/telegram-api.ts";

type Context = { sessionId: string; active: boolean };
const context: Context = { sessionId: "session-1", active: true };

function fixture(options: { failure?: boolean; deferSend?: boolean; target?: { chatId: number; threadId?: number } } = {}) {
  const sent: TelegramSendMessageBody[] = [];
  const ownership: Array<Record<string, unknown>> = [];
  let releaseSend: (() => void) | undefined;
  let target = options.target ?? { chatId: 17, threadId: 31 };
  let transportStamp = { profile: "default", generation: "1" };
  let authority = "direct:1";
  const runtime = createTelegramRemoteDialogRuntime<Context>({
    getTarget: () => target,
    getAllowedUserId: () => 17,
    getBotId: () => 99,
    getTransportStamp: () => transportStamp,
    isTransportStampActive: (stamp) => stamp.profile === transportStamp.profile &&
      stamp.generation === transportStamp.generation,
    getAuthorityKey: () => authority,
    isCurrent: (ctx) => ctx.active,
    getSessionId: (ctx) => ctx.sessionId,
    async sendMessage(body) {
      sent.push(body);
      if (options.deferSend) await new Promise<void>((resolve) => { releaseSend = resolve; });
      if (options.failure) throw new Error("delivery failed");
      return { message_id: sent.length + 100 };
    },
    recordMessageOwnership: (record) => { ownership.push(record); },
    recordError: () => {},
  });
  const incoming = (text: string, overrides: Record<string, unknown> = {}) => ({
    chat: { id: 17 }, from: { id: 17 }, message_id: 211,
    message_thread_id: 31, text,
    reply_to_message: { message_id: 101, from: { id: 99 }, text: sent[0]?.text },
    ...overrides,
  });
  return { runtime, sent, ownership, incoming, setTarget: (next: typeof target) => { target = next; },
    releaseSend: () => { if (!releaseSend) throw new Error("no pending send"); releaseSend(); },
    switchProfile: () => { transportStamp = { profile: "other", generation: "2" }; },
    replaceAuthority: () => { authority = "direct:2"; } };
}

function request(kind: "select" | "confirm" | "input" | "editor", signal: AbortSignal): PiRemoteDialogRequest {
  const common = { type: "ui_prompt_request" as const, requestId: "request-1", sessionId: "session-1", signal, title: "Continue?" };
  if (kind === "select") return { ...common, kind, options: ["A", "B"] };
  if (kind === "confirm") return { ...common, kind, message: "Risky action" };
  if (kind === "editor") return { ...common, kind, prefill: "draft" };
  return { ...common, kind, placeholder: "type here" };
}

test("sends exactly one non-silent targeted notice and settles a numbered choice once", async () => {
  const f = fixture();
  const controller = new AbortController();
  const pending = f.runtime.offer(request("select", controller.signal), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0]?.disable_notification, false);
  assert.equal(f.sent[0]?.message_thread_id, 31);
  assert.deepEqual(f.ownership, [{ chatId: 17, messageId: 101, target: { chatId: 17, threadId: 31 } }]);
  assert.equal(f.runtime.consume(f.incoming("99"), context), true);
  assert.equal(f.sent.length, 1);
  assert.equal(f.runtime.consume(f.incoming("2"), context), true);
  assert.deepEqual(await pending, { action: "handled", value: "B" });
  assert.equal(f.runtime.consume(f.incoming("2"), context), true);
});

test("requires exact bot reply, sender, thread, session, and current target", async () => {
  const f = fixture();
  const controller = new AbortController();
  const pending = f.runtime.offer(request("confirm", controller.signal), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.runtime.consume(f.incoming("yes", { message_thread_id: 32 }), context), true);
  assert.equal(f.runtime.consume(f.incoming("yes", { from: { id: 42 } }), context), false);
  assert.equal(f.runtime.consume(f.incoming("yes", { reply_to_message: { message_id: 101, from: { id: 42 }, text: f.sent[0]?.text } }), context), false);
  assert.equal(f.runtime.consume(f.incoming("yes"), { sessionId: "another", active: true }), true);
  f.setTarget({ chatId: 17, threadId: 32 });
  assert.equal(f.runtime.consume(f.incoming("yes"), context), true);
  f.setTarget({ chatId: 17, threadId: 31 });
  assert.equal(f.runtime.consume(f.incoming("no"), context), true);
  assert.deepEqual(await pending, { action: "handled", value: false });
});

test("input and editor preserve text, and cancellation does not become model input", async () => {
  for (const kind of ["input", "editor"] as const) {
    const f = fixture();
    const controller = new AbortController();
    const pending = f.runtime.offer(request(kind, controller.signal), context);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.runtime.consume(f.incoming("line 1\nline 2"), context), true);
    assert.deepEqual(await pending, { action: "handled", value: "line 1\nline 2" });
  }
  const f = fixture();
  const pending = f.runtime.offer(request("input", new AbortController().signal), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.runtime.consume(f.incoming("/cancel"), context), true);
  assert.deepEqual(await pending, { action: "handled", value: undefined });
});

test("profile or delivery-authority replacement cannot settle an old dialog", async () => {
  for (const change of ["switchProfile", "replaceAuthority"] as const) {
    const f = fixture();
    const controller = new AbortController();
    const pending = f.runtime.offer(request("confirm", controller.signal), context);
    await new Promise((resolve) => setImmediate(resolve));
    f[change]();
    assert.equal(f.runtime.consume(f.incoming("yes"), context), true);
    controller.abort();
    assert.deepEqual(await pending, { action: "pass" });
  }
});

test("classic private chats omit the Thread field and escape untrusted dialog text", async () => {
  const f = fixture({ target: { chatId: 17 } });
  const pending = f.runtime.offer({ ...request("confirm", new AbortController().signal),
    kind: "confirm", message: "Delete <items> & continue?", title: "Confirm <all>" }, context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.sent[0]?.message_thread_id, undefined);
  assert.match(f.sent[0]?.text ?? "", /Confirm &lt;all&gt;/);
  assert.match(f.sent[0]?.text ?? "", /Delete &lt;items&gt; &amp; continue/);
  assert.equal(f.runtime.consume(f.incoming("sì", { message_thread_id: undefined }), context), true);
  assert.deepEqual(await pending, { action: "handled", value: true });
});

test("delivery failure falls back locally and an aborted request cannot accept late replies", async () => {
  const failed = fixture({ failure: true });
  assert.deepEqual(await failed.runtime.offer(request("input", new AbortController().signal), context), { action: "pass" });
  assert.equal(failed.ownership.length, 0);
  const f = fixture();
  const controller = new AbortController();
  const pending = f.runtime.offer(request("input", controller.signal), context);
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  assert.deepEqual(await pending, { action: "pass" });
  assert.equal(f.runtime.consume(f.incoming("late"), context), true);
});

function questionRequest(multiSelect = false, signal = new AbortController().signal) {
  const settled: PiCodeQuestionOutcome[] = [];
  let claimed = false;
  let touches = 0;
  const offer: PiCodeQuestionOffer = {
    version: 1, requestId: "question-1", sessionId: "session-1", signal,
    question: "Pick <one> & explain", header: "Scope",
    options: [{ label: "Alpha", description: "first <option>" }, { label: "Beta" }],
    multiSelect, allowFreeText: !multiSelect,
    claim: () => {
      if (claimed) return undefined;
      claimed = true;
      return (outcome) => { settled.push(outcome); return true; };
    },
    touch: () => { touches++; return true; },
  };
  return { offer, settled, claims: () => Number(claimed), touches: () => touches };
}

test("question offer claims synchronously and sends one exact-target non-silent notice", async () => {
  const f = fixture();
  const q = questionRequest();
  assert.equal(f.runtime.offerQuestion(q.offer, context), true);
  assert.equal(q.claims(), 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0]?.chat_id, 17);
  assert.equal(f.sent[0]?.message_thread_id, 31);
  assert.equal(f.sent[0]?.disable_notification, false);
  assert.match(f.sent[0]?.text ?? "", /Pick &lt;one&gt; &amp; explain/);
  assert.match(f.sent[0]?.text ?? "", /first &lt;option&gt;/);
  assert.deepEqual(f.ownership, [{ chatId: 17, messageId: 101, target: { chatId: 17, threadId: 31 } }]);
  assert.equal(f.runtime.consume(f.incoming("2"), context), true);
  assert.deepEqual(q.settled, [{ action: "answer", indices: [2] }]);
  assert.equal(q.touches(), 1);
  assert.equal(f.runtime.consume(f.incoming("2"), context), true);
  assert.equal(q.settled.length, 1);
});

test("question replies support multi-select, none, free text and cancel", async () => {
  for (const [text, expected] of [
    ["2, 1", { action: "answer", indices: [2, 1] }],
    ["none", { action: "answer", indices: [] }],
    ["/cancel", { action: "cancel" }],
  ] as const) {
    const f = fixture();
    const q = questionRequest(true);
    assert.equal(f.runtime.offerQuestion(q.offer, context), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.runtime.consume(f.incoming(text), context), true);
    assert.deepEqual(q.settled, [expected]);
  }
  for (const [text, expected] of [
    ["plain answer", { action: "text", text: "plain answer" }],
    ["/text 2", { action: "text", text: "2" }],
    ["1", { action: "answer", indices: [1] }],
  ] as const) {
    const f = fixture();
    const q = questionRequest();
    assert.equal(f.runtime.offerQuestion(q.offer, context), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.runtime.consume(f.incoming(text), context), true);
    assert.deepEqual(q.settled, [expected]);
  }
});

test("question replies require the original bot message, owner, Thread, session and transport", async () => {
  const f = fixture();
  const q = questionRequest();
  assert.equal(f.runtime.offerQuestion(q.offer, context), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.runtime.consume(f.incoming("plain", { reply_to_message: undefined }), context), false);
  assert.equal(f.runtime.consume(f.incoming("1", { from: { id: 42 } }), context), false);
  assert.equal(f.runtime.consume(f.incoming("1", { message_thread_id: 32 }), context), true);
  assert.equal(f.runtime.consume(f.incoming("1"), { sessionId: "session-2", active: true }), true);
  f.replaceAuthority();
  assert.equal(f.runtime.consume(f.incoming("1"), context), true);
  assert.deepEqual(q.settled, []);
  assert.equal(q.touches(), 0);
});

test("invalid question replies stay pending and reset an active idle timer", async () => {
  const f = fixture();
  const q = questionRequest(true);
  assert.equal(f.runtime.offerQuestion(q.offer, context), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.runtime.consume(f.incoming("/abort"), context), false);
  assert.equal(q.touches(), 0);
  assert.equal(f.runtime.consume(f.incoming("1, 9"), context), true);
  assert.deepEqual(q.settled, []);
  assert.equal(q.touches(), 1);
  assert.equal(f.runtime.consume(f.incoming("1, 2"), context), true);
  assert.deepEqual(q.settled, [{ action: "answer", indices: [1, 2] }]);
  assert.equal(q.touches(), 2);
});

test("question delivery failure or inactive target releases the local overlay, and abort fences late replies", async () => {
  const inactive = fixture({ target: { chatId: 18 } });
  const noClaim = questionRequest();
  assert.equal(inactive.runtime.offerQuestion(noClaim.offer, context), false);
  assert.equal(noClaim.claims(), 0);
  assert.equal(inactive.sent.length, 0);

  const failed = fixture({ failure: true });
  const declined = questionRequest();
  assert.equal(failed.runtime.offerQuestion(declined.offer, context), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(declined.settled, [{ action: "pass" }]);
  assert.equal(failed.sent.length, 1);
  assert.equal(failed.ownership.length, 0);

  const controller = new AbortController();
  const f = fixture();
  const q = questionRequest(false, controller.signal);
  assert.equal(f.runtime.offerQuestion(q.offer, context), true);
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  assert.equal(f.runtime.consume(f.incoming("1"), context), true);
  assert.deepEqual(q.settled, [{ action: "pass" }]);
});

test("question transport replacement during send cannot publish stale reply authority", async () => {
  const f = fixture({ deferSend: true });
  const q = questionRequest();
  assert.equal(f.runtime.offerQuestion(q.offer, context), true);
  assert.equal(f.sent.length, 1);
  f.switchProfile();
  f.releaseSend();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(q.settled, [{ action: "pass" }]);
  assert.equal(f.ownership.length, 0);
  assert.equal(f.runtime.consume(f.incoming("1"), context), true);
  assert.equal(q.touches(), 0);
});

test("question offer claims in-process through the real Pi event bus, not arbitrary event payloads", async () => {
  const f = fixture();
  const q = questionRequest();
  const bus = createEventBus();
  const pi = { events: bus } as unknown as ExtensionAPI;
  registerPiCodeQuestionResponder(pi, () => context as unknown as ExtensionContext, (offer, ctx) => {
    f.runtime.offerQuestion(offer, ctx as unknown as Context);
  });
  bus.emit(PI_CODE_QUESTION_CHANNEL, { ...q.offer, version: 2 });
  bus.emit(PI_CODE_QUESTION_CHANNEL, { ...q.offer, requestId: "bad<markup>" });
  assert.equal(q.claims(), 0);
  bus.emit(PI_CODE_QUESTION_CHANNEL, q.offer);
  assert.equal(q.claims(), 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.runtime.consume(f.incoming("2"), context), true);
  assert.deepEqual(q.settled, [{ action: "answer", indices: [2] }]);
  bus.clear();
});

test("question prompt in a classic private chat omits the Thread field", async () => {
  const f = fixture({ target: { chatId: 17 } });
  const q = questionRequest(true);
  assert.equal(f.runtime.offerQuestion(q.offer, context), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.sent[0]?.message_thread_id, undefined);
  assert.equal(f.runtime.consume(f.incoming("none", { message_thread_id: undefined }), context), true);
  assert.deepEqual(q.settled, [{ action: "answer", indices: [] }]);
});
