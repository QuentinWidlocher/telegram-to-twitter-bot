import TelegramBot from "node-telegram-bot-api";
import { TwitterApi } from "twitter-api-v2";
import { getAnimationEvent } from "./events/animation";
import { getPhotoEvent } from "./events/photo";
import { getVideoEvent } from "./events/video";

export function getEvents(bot: TelegramBot): Record<string, Event> {
  const events = {
    photo: getPhotoEvent(bot),
    video: getVideoEvent(bot),
    animation: getAnimationEvent(bot),
  };

  return events;
}

export type TelegramBotOn = {
  callback_query: (query: TelegramBot.CallbackQuery) => void;
  inline_query: (query: TelegramBot.InlineQuery) => void;
  poll_answer: (answer: TelegramBot.PollAnswer) => void;
  chosen_inline_result: (result: TelegramBot.ChosenInlineResult) => void;
  shipping_query: (query: TelegramBot.ShippingQuery) => void;
  pre_checkout_query: (query: TelegramBot.PreCheckoutQuery) => void;
  chat_join_request: (request: TelegramBot.ChatMember) => void;
} & {
  [k in TelegramBot.MessageType | "message"]: (
    message: TelegramBot.Message,
    metadata: TelegramBot.Metadata
  ) => void;
} & {
  [k in "chat_member" | "my_chat_member"]: (
    member: TelegramBot.ChatMemberUpdated
  ) => void;
} & {
  [k in "polling_error" | "webhook_error" | "error"]: (error: Error) => void;
} & {
  [k in
    | "channel_post"
    | "edited_message"
    | "edited_message_text"
    | "edited_message_caption"
    | "edited_channel_post"
    | "edited_channel_post_text"
    | "edited_channel_post_caption"]: (message: TelegramBot.Message) => void;
  };

export type EventData = {
  bot: TelegramBot,
  message: string,
  msgFromId: number,
  channelId: string,
  twitterUsername: string | undefined,
  twitterClient: TwitterApi,
  loadingMessage: TelegramBot.Message,
  media: {
    buffer: Buffer,
    mediaId: string,
    mediaType: 'photo' | 'video' | 'animation',
  }
}

export type Event = (msg: TelegramBot.Message) => Promise<EventData>;

export type OnEvent = (
  bot: TelegramBot
) => Event
