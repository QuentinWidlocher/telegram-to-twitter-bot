import invariant from "tiny-invariant";
import { Command } from "../commands";
import { retreive, store } from "../utils/storage";

const channelNameMissing = `
❌ You need to provide a channel name.
Call the command \`/link @<channel-name>\` where @channel-name is the name of the Telegram channel you want to link.
`;
const twitterAccountMissing = `
❌ You need to connect your Twitter account first.
Call the command \`/start\` to start the process.
`;
const successMessage = `
✅ You've just linked your Twitter account to this bot.
Now, you can add this bot to your Telegram channel, and when you send posts here, they will be sent to your Telegram channel *and* Twitter account.

*This bot won't ask for confirmation* though, so everything you'll post here (except for commands) will be sent.
`;

export const getLinkCommand: Command = (bot) => async (msg, match) => {
  console.log("/link <channel>", msg, match);
  invariant(msg.from?.id, "msg.from.id is required");

  const channelName = (match ?? [])[1];
  console.log("channelName", channelName);

  if (!channelName) {
    await bot.sendMessage(msg.chat.id, channelNameMissing, {
      parse_mode: "Markdown",
    });
    return;
  }

  let userData = await retreive(msg.from.id);

  if (!userData.credentials?.oauthVerifier) {
    await bot.sendMessage(msg.chat.id, twitterAccountMissing, {
      parse_mode: "Markdown",
    });
    return;
  }

  await store(msg.from.id, {
    ...userData,
    channelId: channelName,
  });

  await bot.sendMessage(msg.chat.id, successMessage, {
    parse_mode: "Markdown",
  });
};
