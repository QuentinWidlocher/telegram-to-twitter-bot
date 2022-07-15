import { Handler } from "@netlify/functions";
import TelegramBot from "node-telegram-bot-api";
import invariant from "tiny-invariant";
import { getCommands } from "../commands";
import { getEvents } from "../events";
import { createHandled } from "../utils/error-handling";

const token = process.env.TELEGRAM_BOT_TOKEN!;

const tooLongMessage = `
❌ This took too long so the process was aborted... 

This bot is running on a cheap server, if you want to help me improve it, consider donating something to help me cover the costs ❤️

https://ko-fi.com/quentinwidlocher
`;

export const handler: Handler = createHandled(async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  try {
    const body = JSON.parse(event.body);

    console.log("body", body);

    await new Promise<void>((resolve, reject) => {
      const actionNotFoundTimeout = setTimeout(() => {
        reject("timeout");
      }, 5000);

      const tooLongTimeout = setTimeout(() => {
        bot.sendMessage(body.message.chat.id, tooLongMessage);
        reject();
      }, 9000);

      for (const [pattern, handler] of getCommands(bot)) {
        bot.onText(pattern, async (...args) => {
          clearTimeout(actionNotFoundTimeout);

          try {
            await handler(...args);
            clearTimeout(tooLongTimeout);
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
            clearTimeout(tooLongTimeout);
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
