import invariant from "tiny-invariant";
import { Command } from "../commands";
import { update } from "../utils/storage";
import { startLogin } from "../utils/twitter-api";

const welcomeMessage = `
Hey ! Welcome to this bot 👋

You can use it to bind a Twitter account to a Telegram channel.
Each time you send a post in the channel, it will be sent to your Twitter account.

To start, you'll need to connect your Twitter account.
Click the link below to get started. You'll be redirected to this bot and asked to press start again.
`;

export const getStartCommand: Command = (bot) => async (msg) => {
  console.log("/start", msg);
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
  });
};
