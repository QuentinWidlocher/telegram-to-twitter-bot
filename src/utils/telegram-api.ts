import TelegramBot from "node-telegram-bot-api";
import { TweetV2PostTweetResult, TwitterApi } from "twitter-api-v2";
import { parseTweet } from "twitter-text";

export async function sendMessage(
  bot: TelegramBot,
  text: string,
  currentChat: string | number,
  telegramChannel: string,
  twitterClient: TwitterApi,
  media?: {
    buffer: Buffer;
    mediaId: string;
    mediaType: "photo" | "animation" | "video";
  }
) {
  if (text && !parseTweet(text).valid) {
    await bot.sendMessage(currentChat, `This message won't fit in a tweet.`);

    return;
  }

  let tgRes: TelegramBot.Message;
  let twRes: TweetV2PostTweetResult;

  if (media != null) {
    const tgMethods = {
      photo: bot.sendPhoto,
      animation: bot.sendAnimation,
      video: bot.sendVideo,
    };

    [tgRes, twRes] = await Promise.all([
      tgMethods[media.mediaType](telegramChannel, media.buffer, {
        caption: text,
      }),
      twitterClient.v2.tweet(text, {
        media: {
          media_ids: [media.mediaId],
        },
      }),
    ]);
  } else {
    [tgRes, twRes] = await Promise.all([
      bot.sendMessage(telegramChannel, text),
      twitterClient.v2.tweet(text),
    ]);
  }

  if (twRes.errors) {
    console.error("twRes.errors", twRes.errors);
    await bot.sendMessage(telegramChannel, "Error: " + twRes.errors.join("\n"));

    return;
  }

  const tgChannelName = telegramChannel.replace("@", "");

  await bot.sendMessage(
    currentChat,
    `
Message sent to Twitter and Telegram ! 🎉

*Twitter*
https://twitter.com/${tgChannelName}/status/${twRes.data.id}

*Telegram*
https://t.me/${tgChannelName}/${tgRes.message_id}
`.replace(/\_/g, "\\_"),
    { parse_mode: "Markdown" }
  );
}
