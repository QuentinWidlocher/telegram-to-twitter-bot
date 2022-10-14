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
  console.log("sendMultipleMediaObj", datas);
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
    await bot.sendMessage(currentChat, `❌ This message won't fit in a tweet.`);

    return;
  }

  let tgRes: TelegramBot.Message;
  let twRes: TweetV2PostTweetResult;
  const tgChannelName = telegramChannel.replace("@", "");

  let mediaToSendToTg: TelegramBot.InputMedia[] = medias.map(media => ({
    type: media.mediaType,
    media: media.telegramMediaFile.file_id
  }))

  mediaToSendToTg[mediaToSendToTg.length - 1].caption = text;

  [tgRes, twRes] = await Promise.all([
    bot.sendMediaGroup(`@${tgChannelName}`, mediaToSendToTg),
    twitterClient.v2.tweet(text, {
      media: {
        media_ids: medias.map(media => media.twitterMediaId),
      },
    }),
  ]);

  const twitterPostUrl = `https://twitter.com/${twitterName}/status/${twRes.data.id}`;
  const telegramPostUrl = `https://t.me/${tgChannelName}/${tgRes.message_id}`;

  await bot.editMessageText("Message sent to Twitter and Telegram ! 🎉", {
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
  });
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
    await bot.sendMessage(currentChat, `❌ This message won't fit in a tweet.`);

    return;
  }

  let tgRes: TelegramBot.Message;
  let twRes: TweetV2PostTweetResult;
  const tgChannelName = telegramChannel.replace("@", "");

  try {
    if (media != null) {
      console.log("media", media);
      const tgSend = (type: typeof media.mediaType) => {
        switch (type) {
          case "photo":
            return bot.sendPhoto(`@${tgChannelName}`, media.buffer, {
              caption: text,
            });
          case "animation":
            return bot.sendAnimation(`@${tgChannelName}`, media.buffer, {
              caption: text,
            });
          case "video":
            return bot.sendVideo(`@${tgChannelName}`, media.buffer, {
              caption: text,
            });
        }
      };

      [tgRes, twRes] = await Promise.all([
        tgSend(media.mediaType),
        twitterClient.v2.tweet(text, {
          media: {
            media_ids: [media.twitterMediaId],
          },
        }),
      ]);
    } else {
      console.log("no media");
      [tgRes, twRes] = await Promise.all([
        bot.sendMessage(`@${tgChannelName}`, text),
        twitterClient.v2.tweet(text),
      ]);

      console.log("tgRes", tgRes);
      console.log("twRes", twRes);
    }

    const twitterPostUrl = `https://twitter.com/${twitterName}/status/${twRes.data.id}`;
    const telegramPostUrl = `https://t.me/${tgChannelName}/${tgRes.message_id}`;

    await bot.editMessageText("Message sent to Twitter and Telegram ! 🎉", {
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
    });
  } catch (error) {
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
      throw error;
    }
  }
}
