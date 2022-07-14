import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";
import { update, retreive } from "../utils/storage";
import { getClient, startLogin } from "../utils/twitter-api";

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const handler: Handler = async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  try {
    const body = JSON.parse(event.body);

    await new Promise<void>(resolve => {
      bot.onText(/^(?!\/)(.*)/m, async (msg) => {
        console.log("msg", msg);
        invariant(msg.text, "msg.text is required");
        invariant(msg.from?.id, "msg.from.id is required");

        let userData = await retreive(msg.from.id)

        invariant(userData.credentials?.refreshToken, "userData.credentials.refreshToken is required");
        invariant(userData.channelId, "userData.channelId is required");

        let twitterClient = await getClient(userData.credentials.refreshToken)

        let [tgRes, twRes] = await Promise.all([
          bot.sendMessage(userData.channelId, msg.text),
          twitterClient.v2.tweet(msg.text),
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
      })

      bot.onText(/\/start$/m, async (msg) => {
        console.log("/start", msg);
        invariant(msg.from?.id, "msg.from.id is required");

        let { url, codeVerifier } = await startLogin({ userId: msg.from.id, chatId: msg.chat.id });

        console.log("url", url);

        await update(msg.from.id, {
          credentials: {
            codeVerifier
          }
        })

        console.log("updated db");

        await await bot.sendMessage(msg.chat.id, `
Hey ! Welcome to this bot 👋

You can use it to bind a Twitter account to a Telegram channel.
Each time you send a post in the channel, it will be sent to your Twitter account.

To start, you'll need to connect your Twitter account.
Click the link below to get started. You'll be redirected to this bot and asked to press start again.
    `, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Connect this bot to Twitter", url }],
            ],
          },
        });

        resolve();
      });

      bot.onText(/^\/link\s(.*)/m, async (msg, match) => {
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

        if (!credentials?.refreshToken) {
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
      })

      bot.processUpdate(body);
    });
    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: JSON.stringify(e) };
  }
}
