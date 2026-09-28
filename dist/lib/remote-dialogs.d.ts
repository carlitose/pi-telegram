/**
 * Remote Pi dialog bridge
 * Zones: telegram, pi agent
 * Owns one-shot, exact-target replies for host dialogs and typed pi-code questions.
 */
import type { PiCodeQuestionOffer, PiRemoteDialogRequest, PiRemoteDialogResponse } from "./pi.ts";
import type { TelegramTransportStamp } from "./queue.ts";
import type { TelegramSendMessageBody, TelegramSentMessage } from "./telegram-api.ts";
import type { TelegramTarget } from "./target.ts";
export interface TelegramRemoteDialogReply {
    chat: {
        id?: number;
    };
    from?: {
        id?: number;
    };
    message_thread_id?: number;
    text?: string;
    reply_to_message?: {
        message_id?: number;
        text?: string;
        from?: {
            id?: number;
        };
    };
}
export declare function createTelegramRemoteDialogRuntime<TContext>(deps: {
    getTarget(): TelegramTarget | undefined;
    getAllowedUserId(): number | undefined;
    getBotId(): number | undefined;
    getTransportStamp(): TelegramTransportStamp;
    isTransportStampActive(stamp: TelegramTransportStamp): boolean;
    getAuthorityKey(): string | undefined;
    isCurrent(ctx: TContext): boolean;
    getSessionId(ctx: TContext): string;
    sendMessage(body: TelegramSendMessageBody): Promise<TelegramSentMessage>;
    recordMessageOwnership(record: {
        chatId: number;
        messageId: number;
        target: TelegramTarget;
    }): void;
    recordError(error: unknown): void;
}): {
    offer(event: PiRemoteDialogRequest, ctx: TContext): Promise<PiRemoteDialogResponse>;
    offerQuestion(event: PiCodeQuestionOffer, ctx: TContext): boolean;
    consume(message: TelegramRemoteDialogReply, ctx: TContext): boolean;
};
