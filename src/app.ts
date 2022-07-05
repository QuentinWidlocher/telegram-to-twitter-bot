import TelegramBot, { Update } from "node-telegram-bot-api";
import { getClientFromLoginCode, startLogin } from "./utils/twitter-api";
import { retreive, store, update } from "./utils/storage";

export async function app(body: Update, bot: TelegramBot) {
  console.log("body", body);

  return new Promise<void>(resolve => {
    bot.on('text', (msg) => {
      // console.log("msg", msg);
      // await bot.sendMessage(msg.chat.id, `You just said ${msg.text}`);
    })

    bot.onText(/\/start$/m, async (msg) => {
      console.log("/start", msg);
      if (!msg.from?.id) {
        resolve();
        return
      }

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
}
