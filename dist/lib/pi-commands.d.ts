import { type ExtensionAPI, type ExtensionCommandContext, type PiSlashCommandInfo } from "./pi.ts";
export type TelegramPiCommandRequest = {
    kind: "extension";
    name: string;
    args: string;
    sourcePath?: string;
} | {
    kind: "reload";
};
export type TelegramPiCommandPlan = {
    kind: "reply";
    html: string;
} | {
    kind: "prompt";
    text: string;
} | {
    kind: "invoke";
    request: TelegramPiCommandRequest;
};
export interface TelegramPiCommandExecutionDeps {
    ctx: Pick<ExtensionCommandContext, "reload">;
    getCommands: () => readonly PiSlashCommandInfo[];
    sendUserMessage: ExtensionAPI["sendUserMessage"];
    isCurrent: () => boolean;
    reply: (html: string) => Promise<void>;
}
export declare function planTelegramPiCommand(args: string, commands: readonly PiSlashCommandInfo[], readResource?: (path: string) => string): TelegramPiCommandPlan;
export declare function executeTelegramPiCommand(request: TelegramPiCommandRequest, deps: TelegramPiCommandExecutionDeps): Promise<void>;
