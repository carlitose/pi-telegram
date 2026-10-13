import { type TelegramOutboundButtonAction } from "./outbound-buttons.ts";
export type AssistantPromptControl = {
    label: string;
    prompt: string;
    disabled: false;
    selectedStyle?: TelegramOutboundButtonAction["selectedStyle"];
} | {
    label: string;
    disabled: true;
    unavailableReason: "disabled" | "bound-method" | "invalid-bound-method";
};
export interface AssistantPromptControlProjection {
    markdown: string;
    rows: AssistantPromptControl[][];
}
/** Uses the existing HTML compatibility plan without publishing callback authority. */
export declare function projectAssistantPromptControls(markdown: string): AssistantPromptControlProjection;
