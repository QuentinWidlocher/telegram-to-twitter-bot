import { retreive, update } from "../utils/storage";
import { getClient } from "../utils/twitter-api";
import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";
import { createHandled } from "../utils/error-handling";

const token = process.env.TELEGRAM_BOT_TOKEN!;

const redirect = {
  statusCode: 302,
  headers: {
    Location: 'tg://resolve?domain=TgToTwitterBot',
  },
}

export const handler: Handler = createHandled(async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  try {

    const oauthToken = event.queryStringParameters?.oauth_token;
    const oauthVerifier = event.queryStringParameters?.oauth_verifier;
    const userId = event.queryStringParameters?.userId;
    const chatId = event.queryStringParameters?.chatId;

    invariant(oauthToken, "oauthToken is required");
    invariant(oauthVerifier, "oauthVerifier is required");
    invariant(userId, "userId is required");
    invariant(chatId, "chatId is required");

    let { credentials } = await retreive(userId)

    try {
      invariant(credentials?.authLink, "credentials.authLink is required");

      let authentication = await getClient(oauthToken, credentials.authLink.oauth_token_secret, oauthVerifier);
      await update(userId, {
        credentials: {
          ...credentials,
          accessSecret: authentication.accessSecret,
          accessToken: authentication.accessToken,
          oauthVerifier: oauthVerifier,
        }
      })

      await bot.sendMessage(chatId, `
You've just connected your Twitter account to this bot.
Now, call the command \`/link @<channel-name>\` where @channel-name is the name of the Telegram channel you want to link.
      `);
    } catch (error) {
      console.error("error", error);
      await bot.sendMessage(chatId, `
An error occured while connecting your Twitter account to this bot.
Please try again.
      `);
    }
  } catch (error) {
    console.log("error", error);
  }

  return redirect;
})
