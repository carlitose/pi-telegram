/**
 * Regression tests for public package API exports
 * Zones: package boundary, extension interop
 * Guards stable public subpaths and the removal of deep lib wildcard exports
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function assertPackagePathNotExported(specifier: string): Promise<void> {
  await assert.rejects(
    () => import(specifier),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
  );
}

test("Public package subpaths expose the stable extension API", async () => {
  const [
    root,
    inbound,
    outbound,
    delivery,
    activity,
    updates,
    commands,
    sections,
    status,
    voice,
    controls,
    keyboard,
  ] = await Promise.all([
    import("@carlitose86/pi-telegram-reactive"),
    import("@carlitose86/pi-telegram-reactive/inbound"),
    import("@carlitose86/pi-telegram-reactive/outbound"),
    import("@carlitose86/pi-telegram-reactive/delivery"),
    import("@carlitose86/pi-telegram-reactive/activity"),
    import("@carlitose86/pi-telegram-reactive/updates"),
    import("@carlitose86/pi-telegram-reactive/commands"),
    import("@carlitose86/pi-telegram-reactive/sections"),
    import("@carlitose86/pi-telegram-reactive/status"),
    import("@carlitose86/pi-telegram-reactive/voice"),
    import("@carlitose86/pi-telegram-reactive/controls"),
    import("@carlitose86/pi-telegram-reactive/keyboard"),
  ]);

  assert.deepEqual(Object.keys(root), ["default"]);
  assert.deepEqual(Object.keys(inbound).sort(), [
    "registerTelegramInboundHandler",
  ]);
  assert.deepEqual(Object.keys(outbound).sort(), [
    "recordTelegramRuntimeEvent",
    "registerTelegramOutboundHandler",
  ]);
  assert.deepEqual(Object.keys(delivery).sort(), [
    "deleteTelegramView",
    "editTelegramView",
    "sendTelegramChatAction",
    "sendTelegramView",
  ]);
  assert.deepEqual(Object.keys(activity).sort(), [
    "registerTelegramActivityHandler",
  ]);
  assert.deepEqual(Object.keys(updates).sort(), [
    "assertTelegramUpdateExecutionCurrent",
    "carryTelegramUpdateExecutionFence",
    "createTelegramUpdateExecutionFenceGuard",
    "getTelegramUpdateExecutionFence",
    "registerTelegramUpdateHandler",
  ]);
  assert.deepEqual(Object.keys(commands).sort(), ["registerTelegramCommand"]);
  assert.deepEqual(Object.keys(sections).sort(), [
    "getTelegramSectionDiagnostics",
    "registerTelegramSection",
  ]);
  assert.deepEqual(Object.keys(status).sort(), [
    "registerTelegramStatusLineProvider",
  ]);
  assert.deepEqual(Object.keys(voice).sort(), [
    "TELEGRAM_VOICE_REPLY_MODES",
    "computeVoicePromptContribution",
    "computeVoiceTurnFlags",
    "getTelegramVoiceReplyMode",
    "isVoiceTurn",
    "registerTelegramVoiceSynthesisProvider",
    "registerTelegramVoiceTranscriptionProvider",
    "shouldSuppressPreviewForVoice",
  ]);
  assert.deepEqual(Object.keys(controls), ["projectAssistantPromptControls"]);
  assert.deepEqual(controls.projectAssistantPromptControls("<!-- telegram_button {Run|run} -->").rows, [
    [{ label: "Run", prompt: "run", disabled: false }],
  ]);
  assert.deepEqual(Object.keys(keyboard), []);
});

test("Preview declares the verified Pi host target without broad compatibility", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { peerDependencies?: Record<string, string> };
  assert.equal(
    packageJson.peerDependencies?.["@earendil-works/pi-coding-agent"],
    "1.0.0",
  );
  assert.equal(
    packageJson.peerDependencies?.["@earendil-works/pi-agent-core"],
    "1.0.0",
  );
  assert.equal(
    packageJson.peerDependencies?.["@earendil-works/pi-ai"],
    "1.0.0",
  );
});

test("Package-private lib implementation paths are not exported", async () => {
  await assertPackagePathNotExported("@carlitose86/pi-telegram-reactive/lib/updates.ts");
  await assertPackagePathNotExported("@carlitose86/pi-telegram-reactive/lib/sections.ts");
  await assertPackagePathNotExported("@carlitose86/pi-telegram-reactive/api/updates.ts");
});
