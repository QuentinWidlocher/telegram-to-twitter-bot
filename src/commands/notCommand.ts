import invariant from "tiny-invariant";
import { parseTweet } from "twitter-text";
import { Command } from "../commands";
import { retreive } from "../utils/storage";
import { sendMessage } from "../utils/telegram-api";
import { getClientFromUserData } from "../utils/twitter-api";

export const getNotCommand: Command = (bot) => async (msg) => {
  console.log("on message", msg);
  invariant(msg.text, "msg.text is required");
  invariant(msg.from?.id, "msg.from.id is required");

  const loadingMessage = await bot.sendMessage(
    msg.from.id,
    `📤 Sending message...`
  );

  let userData = await retreive(msg.from.id);
  try {
    invariant(userData.channelId, "userData.channelId is required");
  } catch (e) {
    await bot.editMessageText(
      `❌ You need to link your Telegram channel first. Call the command \`/link\` <channel>`,
      {
        parse_mode: "Markdown",
      }
    );
    throw e;
  }

  let twitterClient = await getClientFromUserData(userData);

  await sendMessage(
    bot,
    msg.text,
    msg.from.id,
    userData.channelId,
    userData.twitterUsername,
    twitterClient,
    loadingMessage
  );
};
