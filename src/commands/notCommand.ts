import { err, errAsync, fromPromise, Result } from "neverthrow";
import { Command } from "../commands";
import { retreive } from "../utils/storage";
import { sendMessage, sendMessageObj } from "../utils/telegram-api";
import { getClientFromUserData } from "../utils/twitter-api";

export const getNotCommand: Command = (bot) => async (msg) => {
  console.log("on message", msg);

  if (!msg.text) {
    return err("msg.text is required");
  }

  if (!msg.from?.id) {
    return err("msg.from.id is required");
  }

  const loadingMessage = await fromPromise(bot.sendMessage(
    msg.from.id,
    `📤 Sending message...`
  ), () => "Error sending message to Telegram");

  if (loadingMessage.isErr()) {
    return err(loadingMessage.error);
  }

  console.log("loading message", loadingMessage.value);

  let userData = await retreive(msg.from.id);

  console.log("userData", userData);


  if (userData.isErr() || !userData.value.channelId) {
    let editRes = await fromPromise(bot.editMessageText(
      `❌ You need to link your Telegram channel first. Call the command \`/link\` <channel>`,
      {
        parse_mode: "Markdown",
        chat_id: loadingMessage.value.chat.id,
        message_id: loadingMessage.value.message_id,
      }
    ), (e) => "Error sending message to Telegram");

    if (editRes.isErr()) {
      return err(editRes.error);
    }

    return err("userData is required");
  }

  let twitterClient = getClientFromUserData(userData.value);

  return Result.combine([twitterClient, userData, loadingMessage] as const).map(([twit, usr, loadingMsg]) => sendMessage(
    bot,
    msg.text!,
    msg.from!.id,
    usr.channelId!,
    usr.twitterUsername,
    twit,
    loadingMsg
  ))
};

