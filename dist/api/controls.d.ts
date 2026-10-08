/**
 * Public renderer-neutral assistant controls API.
 * Zones: package boundary, extension interop
 * Exposes pure projection only; consumers own display, lifecycle and explicit activation.
 */
export { projectAssistantPromptControls, type AssistantPromptControl, type AssistantPromptControlProjection, } from "../lib/controls.ts";
