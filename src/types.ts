export type TelegramRequestMessage = {
  chat: {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
  };
  text: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    language_code: "fr";
    is_premium: boolean;
  };
};

export type TelegramRequestBody =
  | {
      message: TelegramRequestMessage;
    }
  | {
      callback_query: {
        message: TelegramRequestMessage;
        data: string;
        from: TelegramRequestMessage["from"];
      };
    };

export type TelegramResponseBody = {
  reply_markup?: {
    inline_keyboard: TelegramInlineKeyboardButton[][];
  };
};

export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data: string;
};
