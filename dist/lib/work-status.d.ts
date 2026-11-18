/**
 * Exact-target, lifecycle-derived visible work status.
 * Zones: telegram, pi agent
 * Owns one silent message per work episode, ordered edits and stale-work fencing.
 * Excludes transport authority, assistant answers, queue policy and task-success claims.
 */
import type { TelegramTarget } from "./target.ts";
export interface TelegramWorkObservation {
    agent?: boolean;
    compaction?: boolean | "unknown";
    waiting?: boolean;
}
interface TelegramWorkStatusScope {
    target?: TelegramTarget;
    isCurrent: () => boolean;
}
export interface TelegramWorkStatusRuntime {
    update: (observation: TelegramWorkObservation) => void;
    reset: () => void;
    waitForIdle: () => Promise<void>;
}
export declare function createTelegramWorkStatusRuntime(deps: {
    capture: () => TelegramWorkStatusScope;
    /** The adapter must send silently and preserve the complete target. */
    send: (target: TelegramTarget, html: string) => Promise<number | undefined>;
    edit: (target: TelegramTarget, messageId: number, html: string) => Promise<unknown>;
    recordFailure: (error: unknown) => void;
}): TelegramWorkStatusRuntime;
export {};
