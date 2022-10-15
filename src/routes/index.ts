import { Handler } from "@netlify/functions";
import TelegramBot from "node-telegram-bot-api";
import invariant from "tiny-invariant";
import { getCommands } from "../commands";
import { EventData, getEvents } from "../events";
import { createHandled } from "../utils/error-handling";
import { sendMessageObj, sendMultipleMediaObj } from "../utils/telegram-api";
import tgLogger from "@quentin_widlocher/telegram-logger";

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

let groupMedia: { data: EventData, resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void }[] = []

export const handler: Handler = createHandled(async (event) => {
  // console.log("event", event);

  const bot = new TelegramBot(token);

  invariant(event.body, "body is required");

  const body = JSON.parse(event.body);

  // console.log("body", body);

  console.log("groupMedia", groupMedia.length, groupMedia.map((m) => m.data.media.telegramMediaFile.file_id))

  invariant(body.message, "body.message is required");

  await new Promise<void>((resolve, reject) => {

    // This will make the bot wait 1 second for multiple events to be triggered (sending a medias as a group)
    let groupActionTimeout = groupMedia.length > 0 ? setTimeout(async () => {
      await sendMultipleMediaObj(groupMedia.map(media => media.data))
      let list = [...groupMedia]
      groupMedia = []
      list.forEach(media => media.resolve())
    }, 8000) : undefined;

    // This will reject the promise and error if nothing triggers the event after 2 seconds
    const actionNotFoundTimeout = setTimeout(() => {
      clearTimeout(tooLongTimeout);
      console.error("action not found");
      bot.sendMessage(body.message.chat.id, noActionMessage);
      reject("timeout");
    }, 2000);

    // This will reject the promise and error if the action takes more than 9 seconds
    const tooLongTimeout = setTimeout(() => {
      console.log("too long");
      bot.sendMessage(body.message.chat.id, tooLongMessage, {
        disable_web_page_preview: true,
      });
      reject();
    }, 9000);

    // We iterate over the available commands and set up the action
    for (const [pattern, handler] of getCommands(bot)) {
      bot.onText(pattern, async (...args) => {
        console.log("onText", pattern, args);

        // We triggered an event so, the action was found
        clearTimeout(actionNotFoundTimeout);

        try {
          await handler(...args);
          resolve();
        } catch (error) {
          console.error(error);
          reject(error);
        } finally {
          // The action was performed, so we won't timeout anymore
          clearTimeout(tooLongTimeout);
          clearTimeout(groupActionTimeout);
          groupMedia = []
        }
      });
    }

    // We iterate over the available events and set up the action
    for (const [event, handler] of Object.entries(getEvents(bot))) {
      bot.on((event as 'photo' | 'video' | 'animation'), async (message: TelegramBot.Message) => {
        console.log("on", event, message);

        // We triggered an event so, the action was found
        clearTimeout(actionNotFoundTimeout);

        try {
          // If we have a 'media_group_id' id it means that we need to wait for the other events to be triggered
          if (message?.media_group_id) {
            console.log('this is a media group, we add', message.photo?.[message.photo.length - 1].file_id, 'to the group')
            let data: EventData = await (handler)(message);

            // We add the data to the groupMedia array if it doesn't exist
            if (groupMedia.every(media => media.data.media.telegramMediaFile.file_id !== data.media.telegramMediaFile.file_id)) {
              groupMedia.push({
                data,
                resolve,
                reject
              })
            }
          } else {
            clearTimeout(groupActionTimeout);
            groupMedia = []
            let data: EventData = await (handler)(message);
            await sendMessageObj(data);
            resolve();
          }

        } catch (error) {
          console.error(error);
          reject(error);
        } finally {
          // The action was performed, so we won't timeout anymore
          clearTimeout(tooLongTimeout);
        }
      });
    }

    // Now that we have set up the actions, we can trigger the event
    bot.processUpdate(body);
  });

  return { statusCode: 200, body: JSON.stringify(event) };
});
