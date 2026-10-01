import type { Logger } from "pino";

// Talking to Telegram (Bot API over HTTPS). Without a bot token the worker
// runs in dry run: every message it would send is recorded in the log
// instead — the texts never hold a phone number (packages/shared
// notifications.ts) — so alerts can be built and tested before a bot exists.

export type InlineButton = { text: string; callbackData: string } | { text: string; url: string };

export interface CallbackQuery {
  id: string;
  /** The Telegram user who pressed the button. */
  fromUserId: string;
  data: string;
  chatId: string | null;
  messageId: number | null;
}

export interface TelegramClient {
  readonly dryRun: boolean;
  sendMessage(chatId: string, text: string, buttons?: InlineButton[][]): Promise<void>;
  /** Long polling: waits up to `timeoutSeconds` for button presses after `offset`. */
  getCallbackQueries(offset: number, timeoutSeconds: number): Promise<{ queries: CallbackQuery[]; nextOffset: number }>;
  answerCallback(queryId: string, text: string): Promise<void>;
  /** Replaces a message's buttons (e.g. "Confirm" becomes "Confirmed"). */
  editButtons(chatId: string, messageId: number, buttons: InlineButton[][]): Promise<void>;
}

const toMarkup = (buttons: InlineButton[][]) => ({
  inline_keyboard: buttons.map((row) => row.map((button) => ("url" in button ? { text: button.text, url: button.url } : { text: button.text, callback_data: button.callbackData }))),
});

export class TelegramError extends Error {
  constructor(
    public readonly method: string,
    public readonly status: number,
    description: string,
  ) {
    // Telegram's description names the problem ("chat not found"); the token is never part of it.
    super(`telegram ${method} failed (${status}): ${description}`);
    this.name = "TelegramError";
  }
}

class HttpTelegramClient implements TelegramClient {
  readonly dryRun = false;
  constructor(private readonly token: string) {}

  private async call<T>(method: string, body: object, timeoutMs = 15_000): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
    if (!response.ok || !data.ok) throw new TelegramError(method, response.status, data.description ?? "no description");
    return data.result as T;
  }

  async sendMessage(chatId: string, text: string, buttons?: InlineButton[][]) {
    await this.call("sendMessage", { chat_id: chatId, text, ...(buttons ? { reply_markup: toMarkup(buttons) } : {}) });
  }

  async getCallbackQueries(offset: number, timeoutSeconds: number) {
    type Update = { update_id: number; callback_query?: { id: string; from: { id: number }; data?: string; message?: { message_id: number; chat: { id: number } } } };
    const updates = await this.call<Update[]>("getUpdates", { offset, timeout: timeoutSeconds, allowed_updates: ["callback_query"] }, (timeoutSeconds + 10) * 1000);
    const queries = updates.flatMap((update) =>
      update.callback_query?.data
        ? [
            {
              id: update.callback_query.id,
              fromUserId: String(update.callback_query.from.id),
              data: update.callback_query.data,
              chatId: update.callback_query.message ? String(update.callback_query.message.chat.id) : null,
              messageId: update.callback_query.message?.message_id ?? null,
            },
          ]
        : [],
    );
    const last = updates[updates.length - 1];
    return { queries, nextOffset: last ? last.update_id + 1 : offset };
  }

  async answerCallback(queryId: string, text: string) {
    await this.call("answerCallbackQuery", { callback_query_id: queryId, text });
  }

  async editButtons(chatId: string, messageId: number, buttons: InlineButton[][]) {
    await this.call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: toMarkup(buttons) });
  }
}

class DryRunTelegramClient implements TelegramClient {
  readonly dryRun = true;
  constructor(private readonly logger: Logger) {}

  async sendMessage(chatId: string, text: string, buttons?: InlineButton[][]) {
    // The chat id is a Telegram user id, not a phone number; only its last digits are shown all the same.
    this.logger.info({ chat: `…${chatId.slice(-3)}`, text, buttons: buttons?.flat().map((button) => button.text) }, "telegram dry run: would send");
  }

  async getCallbackQueries(offset: number, timeoutSeconds: number) {
    // No bot, so no button presses: wait as long as a real poll would, then report nothing.
    await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));
    return { queries: [], nextOffset: offset };
  }

  async answerCallback() {}
  async editButtons() {}
}

export function createTelegramClient(token: string | undefined, logger: Logger): TelegramClient {
  return token ? new HttpTelegramClient(token) : new DryRunTelegramClient(logger);
}
