import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";
import { update, retreive, store } from "../utils/storage";
import { getClient, startLogin } from "../utils/twitter-api";
import { createHandled } from "../utils/error-handling";
import { parseTweet } from 'twitter-text';

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const handler: Handler = createHandled(async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  try {
    const body = JSON.parse(event.body);

    await new Promise<void>((resolve, reject) => {
      bot.on('photo', async (msg) => {
        try {
          invariant(msg.photo, "msg.photo is required");
          invariant(msg.from?.id, "msg.from.id is required");

          const message = msg.text ?? msg.caption;

          invariant(message, "message is required");

          let photoLinks = await Promise.all(msg.photo?.map(photo => bot.downloadFile(photo.file_id, './tmp')));
          console.log("photoLinks", photoLinks);

          let userData = await retreive(msg.from.id)

          if (!parseTweet(message).valid) {
            await bot.sendMessage(msg.chat.id, `This message won't fit in a tweet.`);
            resolve();
            return;
          }

          invariant(userData?.credentials?.accessToken, "userData.credentials.accessToken is required");
          invariant(userData?.credentials?.refreshToken, "userData.credentials.accessSecret is required");
          invariant(userData.channelId, "userData.channelId is required");

          let { client: twitterClient, accessToken, refreshToken } = await getClient(userData.credentials.refreshToken);

          let [tgRes, twRes] = await Promise.all([
            bot.sendMessage(userData.channelId, message),
            twitterClient.v2.tweet(message, {
              media: {
                media_ids: photoLinks,
              }
            }),
            store(msg.from.id, {
              ...userData,
              credentials: {
                ...userData.credentials,
                accessToken,
                refreshToken
              }
            })
          ])

          if (twRes.errors) {
            console.error("twRes.errors", twRes.errors);
            await bot.sendMessage(userData.channelId, "Error: " + twRes.errors.join('\n'));
            resolve();
            return;
          }

          console.log("twRes.data", twRes.data);

          await bot.sendMessage(msg.from.id, "Message sent"),

            resolve();
        } catch (error) {
          console.error("error", error);
          reject(error);
        }
      })

      bot.onText(/^(?!\/)(.*)/m, async (msg) => {
        console.log("msg", msg);
        try {
          invariant(msg.text, "msg.text is required");
          invariant(msg.from?.id, "msg.from.id is required");

          let userData = await retreive(msg.from.id)

          if (!parseTweet(msg.text).valid) {
            await bot.sendMessage(msg.chat.id, `This message won't fit in a tweet.`);
            resolve();
            return;
          }

          invariant(userData?.credentials?.accessToken, "userData.credentials.accessToken is required");
          invariant(userData?.credentials?.refreshToken, "userData.credentials.accessSecret is required");
          invariant(userData.channelId, "userData.channelId is required");

          let { client: twitterClient, accessToken, refreshToken } = await getClient(userData.credentials.refreshToken);

          let [tgRes, twRes] = await Promise.all([
            bot.sendMessage(userData.channelId, msg.text),
            twitterClient.v2.tweet(msg.text),
            store(msg.from.id, {
              ...userData,
              credentials: {
                ...userData.credentials,
                accessToken,
                refreshToken
              }
            })
          ])

          if (twRes.errors) {
            console.error("twRes.errors", twRes.errors);
            await bot.sendMessage(userData.channelId, "Error: " + twRes.errors.join('\n'));
            resolve();
            return;
          }

          console.log("twRes.data", twRes.data);

          await bot.sendMessage(msg.from.id, "Message sent"),

            resolve();
        } catch (error) {
          console.error("error", error);
          reject(error);
        }
      })

      bot.onText(/\/start$/m, async (msg) => {
        try {
          console.log("/start", msg);
          invariant(msg.from?.id, "msg.from.id is required");

          let oauthResult = await startLogin({ userId: msg.from.id, chatId: msg.chat.id });

          console.debug('oauthResult', oauthResult)

          await update(msg.from.id, {
            credentials: {
              state: oauthResult.state,
              codeVerifier: oauthResult.codeVerifier,
            }
          })

          await await bot.sendMessage(msg.chat.id, `
Hey ! Welcome to this bot 👋

You can use it to bind a Twitter account to a Telegram channel.
Each time you send a post in the channel, it will be sent to your Twitter account.

To start, you'll need to connect your Twitter account.
Click the link below to get started. You'll be redirected to this bot and asked to press start again.
    `, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Connect this bot to Twitter", url: oauthResult.url }],
              ],
            },
          });

          resolve();
        } catch (error) {
          console.error("error", error);
          reject(error);
        }
      });

      bot.onText(/^\/link\s(.*)/m, async (msg, match) => {
        try {
          console.log("/link <channel>", msg, match);
          if (!msg.from?.id) {
            resolve();
            return
          }

          const channelName = (match ?? [])[1];
          console.log("channelName", channelName);

          if (!channelName) {
            await bot.sendMessage(msg.chat.id, `
You need to provide a channel name.
Call the command \`/link @<channel-name>\` where @channel-name is the name of the Telegram channel you want to link.
      `);
            resolve();
            return
          }

          let { credentials } = await retreive(msg.from.id)

          if (!credentials?.codeVerifier) {
            await bot.sendMessage(msg.chat.id, `
You need to connect your Twitter account first.
Call the command \`/start\` to start the process.
      `);
            resolve();
            return
          }

          await update(msg.from.id, {
            channelId: channelName,
          })

          await bot.sendMessage(msg.chat.id, `
You've just linked your Twitter account to this bot.
Now, you can add this bot to you channel, and when you send posts, they will be synced with your Twitter account.
    `);
          resolve();
        } catch (error) {
          console.error("error", error);
          reject(error);
        }
      })

      setTimeout(() => {
        reject("timeout");
      }, 3000);

      bot.processUpdate(body);
    });
    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: JSON.stringify(e) };
  }
})
