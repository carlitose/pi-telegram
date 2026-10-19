/**
 * Pure assistant control projection regressions.
 * Zones: assistant markup, public package boundary
 */
import assert from "node:assert/strict";
import test from "node:test";
import { projectAssistantPromptControls } from "../api/controls.ts";
import { planTelegramButtonReply } from "../lib/outbound-buttons.ts";

test("JSON/CML comments and fences share the existing Telegram HTML plan", () => {
  for (const payload of ['[{Run|run|success}[{Wait|||1}{Again|again}]]', '[{"label":"Run","prompt":"run","selected_style":"success"},[{"label":"Wait","disabled":true},{"label":"Again","prompt":"again"}]]']) {
    for (const wrapper of [`<!-- telegram_button ${payload} -->`, `\`\`\`telegram_button\n${payload}\n\`\`\``]) {
      const source = `Before\n${wrapper}\nAfter`;
      const actions: { prompt: string }[] = [];
      const telegram = planTelegramButtonReply(source, { rendering: "html", registerAction: action => { actions.push(action); return String(actions.length - 1); } });
      const projected = projectAssistantPromptControls(source);
      assert.equal(projected.markdown, telegram.markdown);
      assert.deepEqual(projected.rows.map(row => row.map(cell => cell.label)), telegram.replyMarkup?.inline_keyboard.map(row => row.map(cell => cell.text)));
      assert.deepEqual(projected.rows.flat(), [
        { label: "Run", prompt: "run", disabled: false, selectedStyle: "success" },
        { label: "Wait", disabled: true, unavailableReason: "disabled" },
        { label: "Again", prompt: "again", disabled: false },
      ]);
      assert.equal(source, `Before\n${wrapper}\nAfter`);
      assert.deepEqual(projectAssistantPromptControls(source), projected, "redraw is deterministic and registers no durable action");
    }
  }
});

test("bound methods and malformed method syntax are unavailable, never ordinary prompts", () => {
  for (const [prompt, reason] of [["counter::next", "bound-method"], ['counter::next({"n":1})', "bound-method"], ["counter::", "invalid-bound-method"], ["x::next(bad)", "invalid-bound-method"]]) {
    const result = projectAssistantPromptControls(`<!-- telegram_button ${JSON.stringify({label:"Next",prompt})} -->`);
    assert.deepEqual(result.rows.flat(), [{label:"Next",disabled:true,unavailableReason:reason}]);
    assert.ok(!("prompt" in result.rows[0]![0]!));
  }
});

test("literal, malformed and unfinished examples activate nothing", () => {
  for (const source of [
    '`<!-- telegram_button {Run} -->`',
    '````text\n```telegram_button\n{Run}\n```\n````',
    '    <!-- telegram_button {Run} -->',
    '<!-- telegram_button [{Valid}{Broken|}] -->',
    '<!-- telegram_button {Run}',
    '```telegram_button\n{Run}',
    '```telegram_button\n[{Run}{Broken|}]\n```',
  ]) assert.deepEqual(projectAssistantPromptControls(source).rows, [], source);
});

test("ragged rows, escapes, Unicode and button-only fallback remain available", () => {
  const result = projectAssistantPromptControls(String.raw`<!-- telegram_button [[{▶️ A\|B|C:\\work\}}{|||1}]{Again|retry}] -->`);
  assert.equal(result.markdown, "☑️ **Choose an option:**");
  assert.deepEqual(result.rows.map(row=>row.length), [2,1]);
  assert.equal(result.rows[0]![0]!.label, "▶️ A|B");
  assert.equal(result.rows[0]![0]!.disabled, false);
  if (!result.rows[0]![0]!.disabled) assert.equal(result.rows[0]![0]!.prompt, "C:\\work}");
});
