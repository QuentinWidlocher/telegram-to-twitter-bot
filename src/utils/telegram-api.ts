import TelegramBot from "node-telegram-bot-api";
import { TweetV2PostTweetResult, TwitterApi } from "twitter-api-v2";
import { parseTweet } from "twitter-text";

export async function sendMessage(
  bot: TelegramBot,
  text: string,
  currentChat: string | number,
  telegramChannel: string,
  twitterName: string = telegramChannel,
  twitterClient: TwitterApi,
  loadingMessage: TelegramBot.Message,
  media?: {
    buffer: Buffer;
    mediaId: string;
    mediaType: "photo" | "animation" | "video";
  }
) {
  if (text && !parseTweet(text).valid) {
    await bot.sendMessage(currentChat, `❌ This message won't fit in a tweet.`);

    return;
  }

  let tgRes: TelegramBot.Message;
  let twRes: TweetV2PostTweetResult;

  if (media != null) {
    const tgSend = (type: typeof media.mediaType) => {
      switch (type) {
        case "photo":
          return bot.sendPhoto(telegramChannel, media.buffer, {
            caption: text,
          });
        case "animation":
          return bot.sendAnimation(telegramChannel, media.buffer, {
            caption: text,
          });
        case "video":
          return bot.sendVideo(telegramChannel, media.buffer, {
            caption: text,
          });
      }
    };

    [tgRes, twRes] = await Promise.all([
      tgSend(media.mediaType),
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
    await bot.editMessageText(
      "❌ Something went wrong while posting this to Twitter",
      { message_id: loadingMessage.message_id, chat_id: currentChat }
    );

    return;
  }

  const tgChannelName = telegramChannel.replace("@", "");
  const twitterPostUrl = `https://twitter.com/${twitterName}/status/${twRes.data.id}`;
  const telegramPostUrl = `https://t.me/${tgChannelName}/${tgRes.message_id}`;

  await bot.editMessageText(
    `
Message sent to Twitter and Telegram ! 🎉

*Twitter*
${twitterPostUrl}

*Telegram*
${telegramPostUrl}
`.replace(/\_/g, "\\_"),
    {
      message_id: loadingMessage.message_id,
      chat_id: currentChat,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Share Tweet",
              url: `https://t.me/share?url=${encodeURIComponent(
                twitterPostUrl
              )}`,
            },
            {
              text: "Share post",
              url: `https://t.me/share?url=${encodeURIComponent(
                telegramPostUrl
              )}`,
            },
          ],
        ],
      },
    }
  );
}
