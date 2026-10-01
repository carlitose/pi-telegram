/**
 * Renderer-neutral assistant prompt controls.
 * Zones: assistant markup, extension interop
 * Owns pure footer/list projection; excludes action storage, transport, app execution and host lifecycle.
 */
import { parseGenerativeAppBoundAction } from "./generative-apps.js";
import { planTelegramButtonReply } from "./outbound-buttons.js";
/** Uses the existing HTML compatibility plan without publishing callback authority. */
export function projectAssistantPromptControls(markdown) {
    const actions = new Map();
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
            if (!action)
                return { label, disabled: true, unavailableReason: "disabled" };
            try {
                if (parseGenerativeAppBoundAction(action.prompt)) {
                    return { label, disabled: true, unavailableReason: "bound-method" };
                }
            }
            catch {
                return { label, disabled: true, unavailableReason: "invalid-bound-method" };
            }
            return {
                label, prompt: action.prompt, disabled: false,
                ...(action.selectedStyle ? { selectedStyle: action.selectedStyle } : {}),
            };
        })),
    };
}
