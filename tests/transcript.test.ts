/**
 * Regression tests for the standalone read-only terminal controls projection.
 * Covers public transformer registration, safe labels and unavailable methods.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { ExtensionAPI } from "../lib/pi.ts";
type Transformer = Parameters<ExtensionAPI["registerMarkdownTransformer"]>[0];

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const resource = "lib/transcript.ts";
const context = { messageType: "assistant", isStreaming: false, availableWidth: 40 } as const;
const payload = '[{"label":"▶️ Una prova","prompt":"Run exactly one trial"},{"label":"⏸️ Non rilanciare","prompt":"Do not run"}]';
const wrapped = `Prima.\n<!-- telegram_button ${payload} -->`;

async function fixture() {
  let transform: Transformer | undefined;
  const { registerTelegramTranscript: register } = await import("../lib/transcript.ts");
  register(new Proxy({
    registerMarkdownTransformer: (callback: Transformer) => { transform = callback; },
  }, {
    get(target, name) {
      if (!(name in target)) assert.fail(`Display must not access ${String(name)}`);
      return Reflect.get(target, name);
    },
  }) as unknown as ExtensionAPI);
  assert.ok(transform);
  return transform;
}

test("the standalone composition registers its own projection", () => {
  const composition = readFileSync(join(root, "lib/extension.ts"), "utf8");
  assert.ok(existsSync(join(root, resource)), "standalone TUI projection is missing");
  assert.match(composition, /Transcript\.registerTelegramTranscript\(pi\)/);
  assert.doesNotMatch(composition, /pi-personal-config|prompt-choice/);
});

test("the same Telegram controls appear as numbered readable terminal choices", async () => {
  const transform = await fixture();
  const output = transform(wrapped, context);
  assert.match(output, /1\. ▶️ Una prova/);
  assert.match(output, /2\. ⏸️ Non rilanciare/);
  assert.ok(output.includes("Prima."));
  assert.doesNotMatch(output, /telegram_button|prompt-choice|editor widget|Run exactly one trial/);
  assert.equal(wrapped, `Prima.\n<!-- telegram_button ${payload} -->`, "stored Telegram markup stays untouched");
});

test("JSON and CML comments/fences share the actual public parser", async () => {
  const transform = await fixture();
  for (const body of ['[{Run|run}[{Wait|||1}{Again|again}]]', '[{"label":"Run","prompt":"run"},[{"label":"Wait","disabled":true},{"label":"Again","prompt":"again"}]]']) {
    for (const wrapper of [`<!-- telegram_button ${body} -->`, `\`\`\`telegram_button\n${body}\n\`\`\``]) {
      const output = transform(`Before\n${wrapper}\nAfter`, context);
      assert.match(output, /1\. Run/);
      assert.match(output, /2\. Wait \(unavailable: disabled\)/);
      assert.match(output, /3\. Again/);
      assert.ok(output.includes("Before") && output.includes("After"));
      assert.doesNotMatch(output, /telegram_button/);
    }
  }
});

test("button-only output remains readable", async () => {
  const transform = await fixture();
  const output = transform(`<!-- telegram_button ${payload} -->`, context);
  assert.match(output, /1\. ▶️ Una prova/);
  assert.match(output, /2\. ⏸️ Non rilanciare/);
});

test("user and thinking text are never transformed", async () => {
  const transform = await fixture();
  for (const messageType of ["user", "assistant-thinking"] as const) {
    assert.equal(transform(wrapped, { ...context, messageType }), wrapped);
  }
});

test("literal, malformed and unfinished wrappers remain literal", async () => {
  const transform = await fixture();
  for (const source of [
    '`<!-- telegram_button {Run} -->`',
    '````text\n```telegram_button\n{Run}\n```\n````',
    '    <!-- telegram_button {Run} -->',
    '<!-- telegram_button [{Valid}{Broken|}] -->',
    '<!-- telegram_button {Run}',
    '```telegram_button\n{Run}',
  ]) {
    assert.equal(transform(source, context), source);
    assert.equal(transform(source, { ...context, isStreaming: true }), source);
  }
});

test("bound methods remain visibly unavailable, never submitted", async () => {
  const transform = await fixture();
  for (const [prompt, reason] of [["counter::next", "bound-method"], ["counter::", "invalid-bound-method"]]) {
    const raw = `<!-- telegram_button ${JSON.stringify({ label: "Next", prompt })} -->`;
    assert.match(transform(raw, context), new RegExp(`1\\. Next \\(unavailable: ${reason}\\)`));
  }
});

test("redraw, streaming and narrow-width projection are pure and idempotent", async () => {
  const transform = await fixture();
  const first = transform(wrapped, context);
  for (const availableWidth of [1, 40, 80]) {
    for (const isStreaming of [true, false]) {
      assert.equal(transform(wrapped, { ...context, availableWidth, isStreaming }), first);
      assert.equal(transform(first, { ...context, availableWidth, isStreaming }), first);
    }
  }
});

test("labels cannot inject terminal sequences, additional lines or Markdown links", async () => {
  const transform = await fixture();
  const label = '\u001b[31m[evil](https://invalid.example)\nnext\u202e';
  const raw = `<!-- telegram_button ${JSON.stringify({ label, prompt: "safe" })} -->`;
  const output = transform(raw, context);
  assert.doesNotMatch(output, /\u001b|\u202e/);
  assert.ok(output.includes('\\[evil\\]'));
  assert.doesNotMatch(output, /\nnext/);
});

test("unsupported hosts are not patched or given a hidden input fallback", async () => {
  const { registerTelegramTranscript: register } = await import("../lib/transcript.ts");
  assert.doesNotThrow(() => register({} as ExtensionAPI));
});
