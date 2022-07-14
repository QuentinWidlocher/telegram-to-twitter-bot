import { app } from "../app";
import { retreive, update } from "../utils/storage";
import { getClientFromLoginCode, startLogin } from "../utils/twitter-api";
import TelegramBot from "node-telegram-bot-api";
import { Handler } from "@netlify/functions";
import invariant from "tiny-invariant";

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const handler: Handler = async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  try {
    await app(JSON.parse(event.body), bot);
    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: JSON.stringify(e) };
  }
}
