import { retreive, store, update } from "../utils/storage";
import { generateOauthClient } from "../utils/twitter-api";
import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";
import { createHandled } from "../utils/error-handling";
import { err, fromPromise, ok } from "neverthrow";
import { Event } from "@netlify/functions/dist/function/event";

const token = process.env.TELEGRAM_BOT_TOKEN!;

const redirect = {
  statusCode: 302,
  headers: {
    Location: "tg://resolve?domain=TgToTwitterBot",
  },
} as const;

async function authorize(event: Event) {
  const bot = new TelegramBot(token);

  const oauthToken = event.queryStringParameters?.oauth_token;
  const oauthVerifier = event.queryStringParameters?.oauth_verifier;
  const userId = event.queryStringParameters?.userId;
  const chatId = event.queryStringParameters?.chatId;

  if (!oauthToken) {
    return err("oauthToken is required");
  }

  if (!oauthVerifier) {
    return err("oauthVerifier is required");
  }

  if (!userId) {
    return err("userId is required");
  }

  if (!chatId) {
    return err("chatId is required");
  }

  let userDataRes = await retreive(userId);

  if (userDataRes.isErr()) {
    return err("Unable to retreive user data");
  }

  let userData = userDataRes.value;

  if (!userData.credentials?.oauthToken) {
    return err("User has no oauthToken");
  }

  if (!userData.credentials?.oauthTokenSecret) {
    return err("User has no oauthTokenSecret");
  }

  let authenticationRes = await generateOauthClient(
    oauthToken,
    userData.credentials.oauthTokenSecret,
    oauthVerifier
  );

  let storeRes = await authenticationRes.asyncAndThen(authentication =>
    store(userId, {
      ...userDataRes,
      credentials: {
        ...userData.credentials,
        accessToken: authentication.accessToken,
        accessSecret: authentication.accessSecret,
        oauthVerifier,
      },
      twitterUsername: authentication.screenName,
    })
  )

  if (storeRes.isErr()) {
    return err("Unable to store user data");
  }

  let responseRes = await fromPromise(bot.sendMessage(
    chatId,
    `
✅ You've just connected your Twitter account to this bot.
Now, call the command \`/link @<channel-name>\` where \`@channel-name\` is the name of the Telegram channel you want to link.
      `,
    { parse_mode: "Markdown" }
  ), () => "Error sending message to Telegram");

  if (responseRes.isErr()) {
    return err("Unable to send message to Telegram");
  } else {
    return ok(redirect);
  }
}

export const handler: Handler = async (event) => {
  console.log("event", event);

  let result = await authorize(event)

  if (result.isErr()) {
    return {
      statusCode: 500,
      body: result.error,
    }
  } else {
    return result.value;
  }
};
