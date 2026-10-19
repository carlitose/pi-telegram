/**
 * Renderer-neutral assistant prompt controls.
 * Zones: assistant markup, extension interop
 * Owns pure footer/list projection; excludes action storage, transport, app execution and host lifecycle.
 */
import { parseGenerativeAppBoundAction } from "./generative-apps.ts";
import { planTelegramButtonReply, type TelegramOutboundButtonAction } from "./outbound-buttons.ts";

export type AssistantPromptControl =
  | { label: string; prompt: string; disabled: false; selectedStyle?: TelegramOutboundButtonAction["selectedStyle"] }
  | { label: string; disabled: true; unavailableReason: "disabled" | "bound-method" | "invalid-bound-method" };

export interface AssistantPromptControlProjection {
  markdown: string;
  rows: AssistantPromptControl[][];
}

/** Uses the existing HTML compatibility plan without publishing callback authority. */
export function projectAssistantPromptControls(markdown: string): AssistantPromptControlProjection {
  const actions = new Map<string, TelegramOutboundButtonAction>();
  const plan = planTelegramButtonReply(markdown, {
    rendering: "html",
    registerAction: action => {
      const key = String(actions.size);
      actions.set(key, action);
      return key;
    },
  });
  return {
    markdown: plan.markdown,
    rows: (plan.replyMarkup?.inline_keyboard ?? []).map(row => row.map(cell => {
      const label = cell.text;
      const action = actions.get(cell.callback_data ?? "");
      if (!action) return { label, disabled: true, unavailableReason: "disabled" };
      try {
        if (parseGenerativeAppBoundAction(action.prompt)) {
          return { label, disabled: true, unavailableReason: "bound-method" };
        }
      } catch {
        return { label, disabled: true, unavailableReason: "invalid-bound-method" };
      }
      return {
        label, prompt: action.prompt, disabled: false,
        ...(action.selectedStyle ? { selectedStyle: action.selectedStyle } : {}),
      };
    })),
  };
}
