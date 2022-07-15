import { retreive, update } from "../utils/storage";
import { generateOauthClient } from "../utils/twitter-api";
import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";
import { createHandled } from "../utils/error-handling";

const token = process.env.TELEGRAM_BOT_TOKEN!;

const redirect = {
  statusCode: 302,
  headers: {
    Location: "tg://resolve?domain=TgToTwitterBot",
  },
};

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

    let { credentials } = await retreive(userId);

    try {
      invariant(credentials?.oauthToken, "credentials.oauthToken is required");
      invariant(
        credentials?.oauthTokenSecret,
        "credentials.oauthTokenSecret is required"
      );

      let authentication = await generateOauthClient(
        oauthToken,
        credentials?.oauthTokenSecret,
        oauthVerifier
      );

      await update(userId, {
        credentials: {
          ...credentials,
          accessToken: authentication.accessToken,
          accessSecret: authentication.accessSecret,
          oauthVerifier,
        },
      });

      await bot.sendMessage(
        chatId,
        `
You've just connected your Twitter account to this bot.
Now, call the command \`/link @<channel-name>\` where \`@channel-name\` is the name of the Telegram channel you want to link.
      `,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("error", error);
      await bot.sendMessage(
        chatId,
        `
An error occured while connecting your Twitter account to this bot.
Please try again.
      `
      );
    }
  } catch (error) {
    console.log("error", error);
  } finally {
    return redirect;
  }
});
