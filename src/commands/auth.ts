import { errAsync, fromPromise, fromSafePromise, okAsync, Result } from "neverthrow";
import invariant from "tiny-invariant";
import { Command } from "../commands";
import { update } from "../utils/storage";
import { startLogin } from "../utils/twitter-api";

const welcomeMessage = `
Click the link below to authorize this bot to post on your Twitter account.
`;

export const getAuthCommand: Command = (bot) => async (msg) => {
  console.log("/auth", msg);

  if (!msg.from?.id) {
    return errAsync("msg.from.id is required");
  }

  let oauthResult = await startLogin({
    userId: msg.from.id,
    chatId: msg.chat.id,
  });

  oauthResult.map(it => console.debug("oauthResult", it))

  await oauthResult.map(it => update(msg.from!.id, {
    credentials: {
      oauthToken: it.oauth_token,
      oauthTokenSecret: it.oauth_token_secret,
    },
  }));

  return oauthResult.map(it => fromPromise(bot.sendMessage(msg.chat.id, welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Connect this bot to Twitter", url: it.url }],
      ],
    },
    parse_mode: "Markdown",
  }), () => "Error sending message to Telegram"));
};
