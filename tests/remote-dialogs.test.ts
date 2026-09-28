/**
 * Regression tests for Telegram remote Pi dialogs
 * Covers exact target and transport authority, typed replies, cancellation, and delivery fallback.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { createTelegramRemoteDialogRuntime } from "../lib/remote-dialogs.ts";
import type { PiRemoteDialogRequest } from "../lib/pi.ts";
import type { TelegramSendMessageBody } from "../lib/telegram-api.ts";

type Context = { sessionId: string; active: boolean };
const context: Context = { sessionId: "session-1", active: true };

function fixture(options: { failure?: boolean; target?: { chatId: number; threadId?: number } } = {}) {
  const sent: TelegramSendMessageBody[] = [];
  const ownership: Array<Record<string, unknown>> = [];
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
