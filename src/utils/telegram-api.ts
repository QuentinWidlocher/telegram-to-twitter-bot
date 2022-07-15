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
  }
) {
  if (!parseTweet(text).valid) {
    await bot.sendMessage(currentChat, `This message won't fit in a tweet.`);

    return;
  }

  let tgRes: TelegramBot.Message;
  let twRes: TweetV2PostTweetResult;

  if (media != null) {
    [tgRes, twRes] = await Promise.all([
      bot.sendPhoto(telegramChannel, media.buffer, {
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

  await bot.sendMessage(
    currentChat,
    `
Message sent to Twitter and Telegram ! 🎉

- *Twitter*: https://twitter.com/${telegramChannel}/status/${twRes.data.id}
- *Telegram*: https://t.me/${telegramChannel}/${tgRes.message_id}
`,
    { parse_mode: "Markdown" }
  );
}
