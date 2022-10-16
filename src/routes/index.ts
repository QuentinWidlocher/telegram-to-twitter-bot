import { Handler } from "@netlify/functions";
import TelegramBot from "node-telegram-bot-api";
import { getCommands } from "../commands";
import { EventData, getEvents } from "../events";
import { createHandled } from "../utils/error-handling";
import { sendMessageObj, sendMultipleMediaObj } from "../utils/telegram-api";
import tgLogger from "@quentin_widlocher/telegram-logger";
import { Event } from "@netlify/functions/dist/function/event";
import { err, errAsync, fromPromise, okAsync } from "neverthrow";

tgLogger.init({
  botToken: process.env.TELEGRAM_BOT_TOKEN!,
  chatId: process.env.TELEGRAM_LOG_CHANNEL_ID!,
})

tgLogger.replaceConsole();

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

let groupMedia: Record<string, EventData[] | null> = {}

export const handler = createHandled((event: Event) => {
  console.log("event", event);

  const bot = new TelegramBot(token);

  if (!event.body) {
    return errAsync('body is required')
  }

  const body: TelegramBot.Update = JSON.parse(event.body);

  console.log("body", body);

  if (!body.message) {
    return errAsync("body.message is required")
  }

  if (body.message.media_group_id) {

    if (!groupMedia[body.message.media_group_id]) {
      console.log('We create the timeout to send media groups')

      groupMedia[body.message.media_group_id] = []

      setTimeout(async () => {
        console.log('We send the media groups')
        let res = await sendMultipleMediaObj(groupMedia[body.message!.media_group_id!]!)

        groupMedia[body.message!.media_group_id!] = null

        if (res.isErr()) {
          console.error(res.error)
          return errAsync(res.error)
        }
      }, 8000);
    }

    console.log('this is a media group, we add', body.message.photo?.[body.message.photo.length - 1].file_id, 'to the group')

    return fromPromise(new Promise<void>((resolve, reject) => {
      // We iterate over the available events and set up the action
      for (const [event, handler] of Object.entries(getEvents(bot))) {
        bot.on((event as 'photo' | 'video' | 'animation'), async (message: TelegramBot.Message) => {
          console.log("on", event, message);

          let handlerResult = await handler(message);

          if (handlerResult.isOk()) {
            groupMedia[body.message!.media_group_id!] = [...(groupMedia[body.message!.media_group_id!] ?? []), handlerResult.value]
            resolve()
          } else {
            console.error("error", handlerResult.error);
            reject(handlerResult.error)
          }
        });
      }

      bot.processUpdate(body);
    }), e => e as string)

  } else {
    return fromPromise(new Promise<void>((resolve, reject) => {

      // This will make the bot wait 1 second for multiple events to be triggered (sending a medias as a group)

      // This will reject the promise and error if nothing triggers the event after 2 seconds
      const actionNotFoundTimeout = setTimeout(() => {
        clearTimeout(tooLongTimeout);
        console.error("action not found");
        bot.sendMessage(body.message!.chat.id, noActionMessage);
        reject("timeout");
      }, 2000);

      // This will reject the promise and error if the action takes more than 9 seconds
      const tooLongTimeout = setTimeout(() => {
        console.log("too long");
        bot.sendMessage(body.message!.chat.id, tooLongMessage, {
          disable_web_page_preview: true,
        });
        reject('too long');
      }, 9000);

      // We iterate over the available commands and set up the action
      for (const [pattern, handler] of getCommands(bot)) {
        bot.onText(pattern, async (...args) => {
          console.log("onText", pattern, args);

          // We triggered an event so, the action was found
          clearTimeout(actionNotFoundTimeout);

          let result = await handler(...args);

          clearTimeout(tooLongTimeout);

          if (result.isOk()) {
            resolve();
          } else {
            console.error("error", result.error);
            reject(result.error);
          }
        });
      }

      // We iterate over the available events and set up the action
      for (const [event, handler] of Object.entries(getEvents(bot))) {
        bot.on((event as 'photo' | 'video' | 'animation'), async (message: TelegramBot.Message) => {
          console.log("on", event, message);

          // We triggered an event so, the action was found
          clearTimeout(actionNotFoundTimeout);

          let handlerResult = await handler(message);

          clearTimeout(tooLongTimeout);

          if (handlerResult.isOk()) {
            let data = handlerResult.value

            let sendResult = await sendMessageObj(data);

            if (sendResult.isOk()) {
              resolve();
            } else {
              console.error("error", sendResult.error);
              reject(sendResult.error);
            }

          } else {
            console.error("error", handlerResult.error);
            reject(handlerResult.error);
          }
        });
      }

      // Now that we have set up the actions, we can trigger the event
      bot.processUpdate(body);
    }), (e) => e as string)
  }

});
