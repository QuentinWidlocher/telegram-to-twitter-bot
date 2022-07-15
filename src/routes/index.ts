import { Handler } from "@netlify/functions";
import TelegramBot from "node-telegram-bot-api";
import invariant from "tiny-invariant";
import { getCommands } from "../commands";
import { getEvents } from "../events";
import { createHandled } from "../utils/error-handling";

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const handler: Handler = createHandled(async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  try {
    const body = JSON.parse(event.body);

    await new Promise<void>((resolve, reject) => {
      const actionNotFoundTimeout = setTimeout(() => {
        reject("timeout");
      }, 5000);

      for (const [pattern, handler] of getCommands(bot)) {
        bot.onText(pattern, async (...args) => {
          clearTimeout(actionNotFoundTimeout);

          try {
            await handler(...args);
            resolve();
          } catch (error) {
            console.error(error);
            reject(error);
          }
        });
      }

      for (const [event, handler] of Object.entries(getEvents(bot))) {
        bot.on(event as any, async (...args) => {
          clearTimeout(actionNotFoundTimeout);

          try {
            await (handler as any)(...args);
            resolve();
          } catch (error) {
            console.error(error);
            reject(error);
          }
        });
      }

      bot.processUpdate(body);
    });
    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: JSON.stringify(e) };
  }
});
