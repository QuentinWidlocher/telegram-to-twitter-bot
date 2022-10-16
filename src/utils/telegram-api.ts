import { err, fromPromise, Result, ResultAsync } from "neverthrow";
import TelegramBot from "node-telegram-bot-api";
import {
  ApiResponseError,
  TweetV2PostTweetResult,
  TwitterApi,
} from "twitter-api-v2";
import { parseTweet } from "twitter-text";
import { EventData } from "../events";

export function sendMessageObj(data: EventData) {
  return sendMessage(
    data.bot,
    data.message,
    data.msgFromId,
    data.channelId,
    data.twitterUsername,
    data.twitterClient,
    data.loadingMessage,
    data.media
  )
}
export function sendMultipleMediaObj(datas: EventData[]) {
  console.log("sendMultipleMediaObj", datas.map(data => data.media).filter(media => ['photo', 'video'].includes(media.mediaType)));
  return sendMultipleMedia(
    datas[0].bot,
    datas[0].message,
    datas[0].msgFromId,
    datas[0].channelId,
    datas[0].twitterUsername,
    datas[0].twitterClient,
    datas[0].loadingMessage,
    datas.map(data => data.media).filter(media => ['photo', 'video'].includes(media.mediaType)) as { buffer: Buffer, twitterMediaId: string, telegramMediaFile: TelegramBot.File, mediaType: 'photo' | 'video' }[]
  )
}

export async function sendMultipleMedia(
  bot: TelegramBot,
  text: string,
  currentChat: string | number,
  telegramChannel: string,
  twitterName: string = telegramChannel,
  twitterClient: TwitterApi,
  loadingMessage: TelegramBot.Message,
  medias: {
    telegramMediaFile: TelegramBot.File,
    twitterMediaId: string,
    mediaType: TelegramBot.InputMedia['type'],
  }[]) {
  if (text && !parseTweet(text).valid) {
    await fromPromise(bot.sendMessage(currentChat, `❌ This message won't fit in a tweet.`),
      () => 'Unable to send message'
    );

    return err("This message won't fit in a tweet");
  }

  const tgChannelName = telegramChannel.replace("@", "");

  let mediaToSendToTg: TelegramBot.InputMedia[] = medias.map(media => ({
    type: media.mediaType,
    media: media.telegramMediaFile.file_id
  }))

  mediaToSendToTg[mediaToSendToTg.length - 1].caption = text;

  let sendResults = Result.combine(await Promise.all([
    fromPromise(bot.sendMediaGroup(`@${tgChannelName}`, mediaToSendToTg), () => 'Error sending message to Telegram'),
    fromPromise(twitterClient.v2.tweet(text, {
      media: {
        media_ids: medias.map(media => media.twitterMediaId),
      },
    }), e => e as ApiResponseError),
  ] as const));

  return sendResults.map((([tg, tw]) => {
    const twitterPostUrl = `https://twitter.com/${twitterName}/status/${tw.data.id}`;
    const telegramPostUrl = `https://t.me/${tgChannelName}/${tg.message_id}`;

    return fromPromise(bot.editMessageText("Message sent to Twitter and Telegram ! 🎉", {
      message_id: loadingMessage.message_id,
      chat_id: currentChat,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "See Tweet",
              url: twitterPostUrl,
            },
            {
              text: "See post",
              url: telegramPostUrl,
            },
          ],
        ],
      },
    }), () => 'Error sending message to Telegram');
  })).asyncAndThen(it => it)
}

export async function sendMessage(
  bot: TelegramBot,
  text: string,
  currentChat: string | number,
  telegramChannel: string,
  twitterName: string = telegramChannel,
  twitterClient: TwitterApi,
  loadingMessage: TelegramBot.Message,
  media?: {
    telegramMediaFile: TelegramBot.File;
    buffer: Buffer,
    twitterMediaId: string;
    mediaType: 'photo' | 'video' | 'animation';
  }
) {
  if (text && !parseTweet(text).valid) {
    await fromPromise(bot.sendMessage(currentChat, `❌ This message won't fit in a tweet.`),
      () => 'Unable to send message'
    );

    return err("This message won't fit in a tweet");
  }

  let sendResults: Result<[TelegramBot.Message, TweetV2PostTweetResult], string | ApiResponseError>
  const tgChannelName = telegramChannel.replace("@", "");

  if (media != null) {
    const tgSend = (type: typeof media.mediaType) => {
      switch (type) {
        case "photo":
          return fromPromise(bot.sendPhoto(`@${tgChannelName}`, media.buffer, {
            caption: text,
          }), () => 'Error sending photo to Telegram');
        case "animation":
          return fromPromise(bot.sendAnimation(`@${tgChannelName}`, media.buffer, {
            caption: text,
          }), () => 'Error sending animation');
        case "video":
          return fromPromise(bot.sendVideo(`@${tgChannelName}`, media.buffer, {
            caption: text,
          }), () => 'Error sending video');
      }
    };

    sendResults = Result.combine(await Promise.all([
      tgSend(media.mediaType),
      fromPromise<TweetV2PostTweetResult, ApiResponseError>(twitterClient.v2.tweet(text, {
        media: {
          media_ids: [media.twitterMediaId],
        },
      }), e => e as ApiResponseError),
    ] as const));
  } else {
    console.log("no media");
    sendResults = Result.combine(await Promise.all([
      fromPromise(bot.sendMessage(`@${tgChannelName}`, text), () => 'Error sending message to Telegram'),
      fromPromise(twitterClient.v2.tweet(text), e => e as ApiResponseError),
    ] as const));
  }

  return sendResults.asyncMap(async it => {
    let [tgRes, twRes] = it

    const twitterPostUrl = `https://twitter.com/${twitterName}/status/${twRes.data.id}`;
    const telegramPostUrl = `https://t.me/${tgChannelName}/${tgRes.message_id}`;

    return fromPromise(bot.editMessageText("Message sent to Twitter and Telegram ! 🎉", {
      message_id: loadingMessage.message_id,
      chat_id: currentChat,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "See Tweet",
              url: twitterPostUrl,
            },
            {
              text: "See post",
              url: telegramPostUrl,
            },
          ],
        ],
      },
    }), () => '')
  }).mapErr(async error => {
    if (error instanceof ApiResponseError) {
      await bot.editMessageText(
        `❌ ${error.data.detail ??
        "Something went wrong while posting this to Twitter"
        } (the Telegram post may already be sent)`,
        { message_id: loadingMessage.message_id, chat_id: currentChat }
      );

      return;
    } else {
      await bot.editMessageText(
        `❌ Something went wrong while posting. Check you configuration and try again.`,
        { message_id: loadingMessage.message_id, chat_id: currentChat }
      );
    }
  }).andThen(it => it)
}
