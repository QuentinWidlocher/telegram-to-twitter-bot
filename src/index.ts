import { app } from "./app";
import { retreive, update } from "./utils/storage";
import { getClientFromLoginCode, startLogin } from "./utils/twitter-api";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN!;

export async function handler(event: Event & { body: string, rawPath: string; queryStringParameters: Record<string, string> }) {
  console.log("event", event);

  const bot = new TelegramBot(token);

  if (event.rawPath == '/authorize' && event.queryStringParameters.code && event.queryStringParameters.userId && event.queryStringParameters.chatId) {

    const code = event.queryStringParameters.code;
    const userId = event.queryStringParameters.userId;
    const chatId = event.queryStringParameters.chatId;

    const redirect = {
      statusCode: 302,
      headers: {
        Location: 'tg://resolve?domain=TgToTwitterBot',
      },
    }

    if (!code) {
      let { url, codeVerifier } = await startLogin({ userId, chatId });

      await update(userId, {
        credentials: {
          codeVerifier
        }
      })

      await bot.sendMessage(chatId, `
You need to provide a code.
You can get it by clicking the link below.
      `, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Connect this bot to Twitter", url }],
          ],
        },
      });
      return redirect
    }

    let { credentials } = await retreive(userId)

    try {
      let authentication = await getClientFromLoginCode(code, credentials?.codeVerifier ?? '', { userId, chatId });
      await update(userId, {
        credentials: {
          refreshToken: authentication.refreshToken,
        }
      })

      await bot.sendMessage(chatId, `
You've just connected your Twitter account to this bot.
Now, call the command \`/link @<channel-name>\` where @channel-name is the name of the Telegram channel you want to link.
      `);
    } catch (error) {
      console.log("error", error);
      await bot.sendMessage(chatId, `
An error occured while connecting your Twitter account to this bot.
Please try again.
      `);
    }

    return redirect;
  }

  try {
    await app(JSON.parse(event.body), bot);
    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: JSON.stringify(e) };
  }
}
