import { retreive, update } from "../utils/storage";
import { getClientFromLoginCode, startLogin } from "../utils/twitter-api";
import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";
import { createHandled } from "../utils/error-handling";

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const handler: Handler = createHandled(async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  const code = event.queryStringParameters?.code;
  const userId = event.queryStringParameters?.userId;
  const chatId = event.queryStringParameters?.chatId;

  invariant(code, "code is required");
  invariant(userId, "userId is required");
  invariant(chatId, "chatId is required");

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
})
