/**
 * Visible, exact-target work status regressions.
 * Zones: telegram, pi agent
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramWorkStatusRuntime } from "../lib/work-status.ts";

test("Work status sends silently inside the exact thread and becomes idle only on settlement", async () => {
  const events: unknown[] = [];
  const scope = { target: { chatId: 42, threadId: 99 }, isCurrent: () => true };
  const status = createTelegramWorkStatusRuntime({
    capture: () => scope,
    send: async (target, text) => { events.push(["send", target, text]); return 7; },
    edit: async (target, messageId, text) => { events.push(["edit", target, messageId, text]); },
    recordFailure: (error) => { throw error; },
  });
  status.update({ agent: true });
  await status.waitForIdle();
  assert.deepEqual(events, [["send", scope.target, "<b>⏳ Pi is working.</b>"]]);
  status.update({ waiting: true });
  await status.waitForIdle();
  status.update({ waiting: false });
  await status.waitForIdle();
  status.update({ agent: false });
  await status.waitForIdle();
  assert.deepEqual(events.slice(1), [
    ["edit", scope.target, 7, "<b>⏳ Pi is waiting for your input.</b>"],
    ["edit", scope.target, 7, "<b>⏳ Pi is working.</b>"],
    ["edit", scope.target, 7, "<b>💤 Pi is idle.</b>"],
  ]);
});


test("Compaction stays busy after agent settlement; timeout means unknown, not idle", async () => {
  const texts: string[] = [];
  const status = createTelegramWorkStatusRuntime({
    capture: () => ({ target: { chatId: 42 }, isCurrent: () => true }),
    send: async (_target, text) => { texts.push(text); return 7; },
    edit: async (_target, _id, text) => { texts.push(text); },
    recordFailure: (error) => { throw error; },
  });
  status.update({ agent: true });
  await status.waitForIdle();
  status.update({ compaction: true });
  status.update({ agent: false });
  await status.waitForIdle();
  assert.deepEqual(texts, ["<b>⏳ Pi is working.</b>"]);
  status.update({ compaction: "unknown" });
  await status.waitForIdle();
  assert.equal(texts.at(-1), "<b>⚠️ Pi work status is unknown.</b>");
  status.update({ compaction: false });
  await status.waitForIdle();
  assert.equal(texts.at(-1), "<b>💤 Pi is idle.</b>");
});

test("Reset fences a pending send even when context and transport are reused", async () => {
  const events: string[] = [];
  let resolveSend!: (id: number) => void;
  const status = createTelegramWorkStatusRuntime({
    capture: () => ({ target: { chatId: 42, threadId: 9 }, isCurrent: () => true }),
    send: async () => {
      events.push("send");
      if (events.length === 1) return new Promise<number>((resolve) => { resolveSend = resolve; });
      return 8;
    },
    edit: async (_target, id, text) => { events.push(`${id}:${text}`); },
    recordFailure: (error) => { throw error; },
  });
  status.update({ agent: true });
  await Promise.resolve();
  const old = status.waitForIdle();
  status.update({ agent: false });
  status.reset();
  status.update({ agent: true });
  await status.waitForIdle();
  resolveSend(7);
  await old;
  await Promise.resolve();
  assert.deepEqual(events, ["send", "send"]);
  status.update({ agent: false });
  await status.waitForIdle();
  assert.deepEqual(events, ["send", "send", "8:<b>💤 Pi is idle.</b>"]);
});

test("Authority loss never redirects a queued edit to a replacement thread", async () => {
  const edits: unknown[] = [];
  let target = { chatId: 42, threadId: 9 };
  let authority = 1;
  const status = createTelegramWorkStatusRuntime({
    capture() {
      const captured = authority;
      return { target, isCurrent: () => captured === authority };
    },
    send: async () => 7,
    edit: async (destination, id) => { edits.push([destination, id]); },
    recordFailure: (error) => { throw error; },
  });
  status.update({ agent: true });
  await status.waitForIdle();
  status.update({ waiting: true });
  authority++;
  target = { chatId: 42, threadId: 10 };
  await status.waitForIdle();
  assert.deepEqual(edits, []);
  status.update({ waiting: false });
  await status.waitForIdle();
  status.update({ agent: false });
  await status.waitForIdle();
  assert.deepEqual(edits, [[target, 7]]);
});

test("Failed sends are diagnostic and never replayed on the next transition", async () => {
  let sends = 0;
  const errors: unknown[] = [];
  const status = createTelegramWorkStatusRuntime({
    capture: () => ({ target: { chatId: 42 }, isCurrent: () => true }),
    send: async () => { sends++; throw new Error("outcome unknown"); },
    edit: async () => { assert.fail("No confirmed message to edit"); },
    recordFailure: (error) => { errors.push(error); throw new Error("diagnostic failed"); },
  });
  status.update({ agent: true });
  await status.waitForIdle();
  status.update({ waiting: true });
  await status.waitForIdle();
  status.update({ agent: false, waiting: false });
  await status.waitForIdle();
  assert.equal(sends, 1);
  assert.equal(errors.length, 1);
});

test("Retry starts deduplicate; a new settled episode gets a fresh message", async () => {
  const texts: string[] = [];
  let sends = 0;
  const status = createTelegramWorkStatusRuntime({
    capture: () => ({ target: { chatId: 42, threadId: 9 }, isCurrent: () => true }),
    send: async (_target, text) => { texts.push(text); return ++sends; },
    edit: async (_target, _id, text) => { texts.push(text); },
    recordFailure: (error) => { throw error; },
  });
  status.update({ agent: true });
  await status.waitForIdle();
  status.update({ agent: true });
  await status.waitForIdle();
  assert.equal(sends, 1);
  status.update({ agent: false });
  await status.waitForIdle();
  status.update({ agent: true });
  await status.waitForIdle();
  assert.equal(sends, 2);
  assert.deepEqual(texts, [
    "<b>⏳ Pi is working.</b>", "<b>💤 Pi is idle.</b>", "<b>⏳ Pi is working.</b>",
  ]);
});

test("Idle startup and unavailable transport never invent a status", async () => {
  let sends = 0;
  const status = createTelegramWorkStatusRuntime({
    capture: () => ({ target: { chatId: 42 }, isCurrent: () => false }),
    send: async () => { sends++; return 7; },
    edit: async () => { assert.fail("No status to edit"); },
    recordFailure: (error) => { throw error; },
  });
  status.update({ agent: false });
  status.update({ agent: true });
  await status.waitForIdle();
  assert.equal(sends, 0);
});