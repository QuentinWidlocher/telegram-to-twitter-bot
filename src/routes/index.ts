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

const noActionMessage = `
❌ This is not a valid command, or a valid message.

If you want to know what commands this bot support, use /help.
`;

export const handler: Handler = createHandled(async (event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  try {
    const body = JSON.parse(event.body);

    console.log("body", body);

    invariant(body.message, "body.message is required");

    await new Promise<void>((resolve, reject) => {
      const actionNotFoundTimeout = setTimeout(() => {
        clearTimeout(tooLongTimeout);
        console.error("action not found");
        bot.sendMessage(body.message.chat.id, noActionMessage);
        reject("timeout");
      }, 1000);

      const tooLongTimeout = setTimeout(() => {
        console.log("too long");
        bot.sendMessage(body.message.chat.id, tooLongMessage, {
          disable_web_page_preview: true,
        });
        reject();
      }, 9000);

      for (const [pattern, handler] of getCommands(bot)) {
        bot.onText(pattern, async (...args) => {
          console.log("onText", pattern, args);
          clearTimeout(actionNotFoundTimeout);

          try {
            await handler(...args);
            resolve();
          } catch (error) {
            console.error(error);
            reject(error);
          } finally {
            clearTimeout(tooLongTimeout);
          }
        });
      }

      for (const [event, handler] of Object.entries(getEvents(bot))) {
        bot.on(event as any, async (...args) => {
          console.log("on", event, args);
          clearTimeout(actionNotFoundTimeout);

          try {
            await (handler as any)(...args);
            clearTimeout(tooLongTimeout);
            resolve();
          } catch (error) {
            console.error(error);
            reject(error);
          } finally {
            clearTimeout(tooLongTimeout);
          }
        });
      }

      bot.processUpdate(body);
    });

    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify(e) };
  }
});
