/**
 * Pi command catalog, SDK submission, and durable gateway regressions.
 * Zones: pi agent commands, telegram controls, tests
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramCommandOrPromptRuntime, createTelegramSessionActionRuntime } from "../lib/commands.ts";
import { executeTelegramPiCommand, planTelegramPiCommand, type TelegramPiCommandExecutionDeps } from "../lib/pi-commands.ts";
import type { ExtensionCommandContext, PiSlashCommandInfo } from "../lib/pi.ts";

const command = (name: string, source: PiSlashCommandInfo["source"] = "extension", path = `/private/${name}`): PiSlashCommandInfo => ({
  name, source, description: `Run ${name}`,
  sourceInfo: { path, source: "local", scope: "user", origin: "top-level" },
});
const invoke = (args: string, catalog: PiSlashCommandInfo[]) => {
  const plan = planTelegramPiCommand(args, catalog);
  assert.equal(plan.kind, "invoke");
  if (plan.kind !== "invoke") throw new Error("Missing invocation plan");
  return plan.request;
};
function execution(getCommands: () => PiSlashCommandInfo[]) {
  const sent: { text: unknown; options: unknown }[] = [];
  const replies: string[] = [];
  let reloads = 0;
  const deps: TelegramPiCommandExecutionDeps = {
    ctx: { async reload() { reloads++; } }, getCommands, isCurrent: () => true,
    sendUserMessage(text, options) { sent.push({ text, options }); },
    async reply(html) { replies.push(html); },
  };
  return { deps, sent, replies, reloads: () => reloads };
}

test("Pi catalog uses each live session snapshot and hides internal paths/commands", () => {
  const first = planTelegramPiCommand("", [command("goal"), command("telegram-internal")]);
  assert.equal(first.kind, "reply");
  if (first.kind !== "reply") return;
  assert.match(first.html, /goal/);
  assert.doesNotMatch(first.html, /telegram-internal|\/private\//);
  const second = planTelegramPiCommand("", [command("new-command")]);
  assert.equal(second.kind, "reply");
  if (second.kind !== "reply") return;
  assert.match(second.html, /new-command/);
  assert.doesNotMatch(second.html, /goal/);
});

test("Pi extension request preserves exact names/arguments without echoing arguments", async () => {
  const catalog = [command("do-work")];
  const request = invoke('/do-work one "two words" --token=synthetic-secret', catalog);
  const fixture = execution(() => catalog);
  await executeTelegramPiCommand(request, fixture.deps);
  assert.deepEqual(fixture.sent, [{ text: '/do-work one "two words" --token=synthetic-secret', options: { expandPromptTemplates: true } }]);
  assert.equal(fixture.reloads(), 0);
  assert.doesNotMatch(fixture.replies.join(""), /synthetic-secret|two words|\/private\//);
  assert.match(fixture.replies.join(""), /[Rr]equest/);
});

test("Pi templates expand into ordinary queued prompt text", () => {
  const plan = planTelegramPiCommand("greet Alice", [command("greet", "prompt", "/prompts/greet.md")], path => {
    assert.equal(path, "/prompts/greet.md");
    return "---\ndescription: Greeting\n---\nHello $1; $ARGUMENTS";
  });
  assert.deepEqual(plan, { kind: "prompt", text: "Hello Alice; Alice" });
});

test("Pi skills use the host frontmatter/body and relative-reference contract", () => {
  const plan = planTelegramPiCommand("skill:demo task details", [command("skill:demo", "skill", "/skills/demo/SKILL.md")], () => "---\nname: demo\n---\nUse scripts/tool.py.\n");
  assert.equal(plan.kind, "prompt");
  if (plan.kind !== "prompt") return;
  assert.equal(plan.text, '<skill name="demo" location="/skills/demo/SKILL.md">\nReferences are relative to /skills/demo.\n\nUse scripts/tool.py.\n</skill>\n\ntask details');
});

test("Pi command removal/provider replacement never falls back to model input", async () => {
  const request = invoke("goal keep going", [command("goal")]);
  for (const catalog of [[], [command("goal", "extension", "/replacement/goal")]]) {
    const fixture = execution(() => catalog);
    await executeTelegramPiCommand(request, fixture.deps);
    assert.deepEqual(fixture.sent, []);
    assert.match(fixture.replies.join(""), /[Aa]vailable/);
  }
});

test("Pi stale session/transport has no execution or stale reply", async () => {
  const catalog = [command("goal")];
  const fixture = execution(() => catalog);
  fixture.deps.isCurrent = () => false;
  await executeTelegramPiCommand(invoke("goal", catalog), fixture.deps);
  assert.deepEqual(fixture.sent, []);
  assert.deepEqual(fixture.replies, []);
});

test("Pi reload uses only command context and announces a request before replacement", async () => {
  const fixture = execution(() => []);
  fixture.deps.reply = async html => {
    assert.equal(fixture.reloads(), 0);
    fixture.replies.push(html);
  };
  await executeTelegramPiCommand(invoke("--reload", []), fixture.deps);
  assert.equal(fixture.reloads(), 1);
  assert.deepEqual(fixture.sent, []);
});

test("Pi private and unsupported TUI commands are explicit replies, not prompts", () => {
  for (const name of ["telegram-internal token", "settings", "missing"]) {
    assert.equal(planTelegramPiCommand(name, [command("telegram-internal")]).kind, "reply");
  }
});

test("Pi request hook owns the entire grouped message without ordinary-model fallback", async () => {
  const messages = [{ text: "/pi goal x", id: 1 }, { text: "", id: 2 }];
  let requested = 0;
  let prompts = 0;
  const runtime = createTelegramCommandOrPromptRuntime<{ text: string; id: number }, object>({
    extractRawText: rows => rows.find(row => row.text)?.text ?? "",
    handleCommand: async () => false,
    async executePiCommand(parsed, rows, _ctx, rawText) {
      assert.equal(parsed.name, "pi");
      assert.equal(rows, messages);
      assert.equal(rawText, "/pi goal x");
      requested++;
      return true;
    },
    replaceMessageText: (message, text) => ({ ...message, text }),
    async enqueueTurn() { prompts++; },
  });
  await runtime.dispatchMessages(messages, {});
  assert.equal(requested, 1);
  assert.equal(prompts, 0);
});

test("Pi callback gateway executes once only after durable update completion", async () => {
  let handler: ((args: string, ctx: ExtensionCommandContext) => Promise<void>) | undefined;
  const submitted: string[] = [];
  let calls = 0;
  let replacements = 0;
  const runtime = createTelegramSessionActionRuntime({
    registerCommand(_name, definition) { handler = async (args, ctx) => { await definition.handler(args, ctx); }; },
    sendUserMessage(text) { submitted.push(String(text)); },
    async notifyResult() {},
  });
  runtime.register();
  const ctx = { ui: { notify() {} }, async newSession() { replacements++; return { cancelled: false }; } } as unknown as ExtensionCommandContext;
  assert.equal(runtime.scheduleAfterUpdate(42, { chatId: 7, threadId: 3, messageId: 11 }, async commandCtx => {
    assert.equal(commandCtx, ctx);
    calls++;
  }), true);
  assert.equal(calls, 0);
  runtime.onUpdateCompleted(41);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(submitted.length, 0);
  runtime.onUpdateCompleted(42);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(submitted.length, 1);
  const token = submitted[0]!.split(" ")[1]!;
  assert.ok(handler);
  await handler(token, ctx);
  await handler(token, ctx);
  runtime.onUpdateCompleted(42);
  assert.equal(calls, 1);
  assert.equal(replacements, 0);
});


test("Pi catalog pages stay bounded and escape installed command metadata", () => {
  const catalog = Array.from({ length: 30 }, (_, index) => command(`command${String(index).padStart(2, "0")}`));
  catalog[0]!.description = "<unsafe>&".repeat(100);
  const first = planTelegramPiCommand("", catalog);
  const second = planTelegramPiCommand("--page 2", catalog);
  assert.equal(first.kind, "reply");
  assert.equal(second.kind, "reply");
  if (first.kind !== "reply" || second.kind !== "reply") return;
  assert.ok(first.html.length < 4096);
  assert.match(first.html, /&lt;unsafe&gt;&amp;/);
  assert.doesNotMatch(first.html, /<unsafe>/);
  assert.match(second.html, /command12/);
  assert.doesNotMatch(second.html, /command00/);
  assert.equal(planTelegramPiCommand("--page 999", catalog).kind, "reply");
});

test("Pi ownership lost during request acknowledgement prevents the later SDK effect", async () => {
  for (const args of ["goal", "--reload"]) {
    const catalog = [command("goal")];
    const fixture = execution(() => catalog);
    fixture.deps.reply = async () => { fixture.deps.isCurrent = () => false; };
    await executeTelegramPiCommand(invoke(args, catalog), fixture.deps);
    assert.equal(fixture.sent.length, 0);
    assert.equal(fixture.reloads(), 0);
  }
});

test("Pi duplicate names preserve the SDK extension-before-resource precedence", () => {
  const request = invoke("goal", [command("goal"), command("goal", "prompt", "/prompts/goal.md")]);
  assert.equal(request.kind, "extension");
});


test("Pi catalog bounds labels without dropping or renaming long SDK commands", () => {
  const name = "native-".repeat(50);
  const catalog = [command(name)];
  const plan = planTelegramPiCommand("", catalog);
  assert.equal(plan.kind, "reply");
  if (plan.kind !== "reply") return;
  assert.ok(plan.html.length < 4096);
  assert.match(plan.html, /name shortened/);
  const request = invoke(name, catalog);
  assert.ok(request.kind === "extension");
  assert.equal(request.name, name);
});
test("Pi catalog truncation preserves valid UTF-8 at emoji boundaries", () => {
  const entry = command("emoji");
  entry.description = "x".repeat(99) + "🎯";
  const plan = planTelegramPiCommand("", [entry]);
  assert.equal(plan.kind, "reply");
  if (plan.kind !== "reply") return;
  assert.equal(Buffer.from(plan.html, "utf-8").toString("utf-8"), plan.html);
  assert.match(plan.html, /🎯/);
});