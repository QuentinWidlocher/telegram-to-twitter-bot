import TelegramBot from "node-telegram-bot-api";
import { TwitterApi } from "twitter-api-v2";
import { getAnimationEvent } from "./events/animation";
import { getPhotoEvent } from "./events/photo";
import { getVideoEvent } from "./events/video";

export function getEvents(bot: TelegramBot) {
  const events = {
    photo: getPhotoEvent(bot),
    video: getVideoEvent(bot),
    animation: getAnimationEvent(bot),
  } as const;

  return events;
}

export type EventData = {
  bot: TelegramBot,
  message: string,
  msgFromId: number,
  channelId: string,
  twitterUsername: string | undefined,
  twitterClient: TwitterApi,
  loadingMessage: TelegramBot.Message,
  media: {
    telegramMediaFile: TelegramBot.File,
    buffer: Buffer,
    twitterMediaId: string,
    mediaType: 'photo' | 'video' | 'animation',
  }
}

export type Event = (msg: TelegramBot.Message) => Promise<EventData>;

export type OnEvent = (
  bot: TelegramBot
) => Event
