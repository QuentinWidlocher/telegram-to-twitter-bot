import invariant from "tiny-invariant";
import { Command } from "../commands";
import { update } from "../utils/storage";
import { startLogin } from "../utils/twitter-api";

const welcomeMessage = `
Click the link below to authorize this bot to post on your Twitter account.
`;

export const getAuthCommand: Command = (bot) => async (msg) => {
  console.log("/auth", msg);
  invariant(msg.from?.id, "msg.from.id is required");

  let oauthResult = await startLogin({
    userId: msg.from.id,
    chatId: msg.chat.id,
  });

  console.debug("oauthResult", oauthResult);

  await update(msg.from.id, {
    credentials: {
      oauthToken: oauthResult.oauth_token,
      oauthTokenSecret: oauthResult.oauth_token_secret,
    },
  });

  await await bot.sendMessage(msg.chat.id, welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Connect this bot to Twitter", url: oauthResult.url }],
      ],
    },
    parse_mode: "Markdown",
  });
};
