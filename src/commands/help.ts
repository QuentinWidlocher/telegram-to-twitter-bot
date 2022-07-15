import { Command } from "../commands";

export const getHelpCommand: Command = (bot) => async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `
📝 Help

This bot is a simple Twitter bot that can be used to send message to Twitter *and* a Telegram channel at the same time.
You can send text, images, gifs and videos (don't send anything too big though)

First you'll need to connect your Twitter account, then you'll need to link this bot to a Telegram channel.
When everything is in place, just send your message here and it'll be synced to your Twitter account *and* your Telegram channel.

You can also [check out the repository](https://github.com/QuentinWidlocher/telegram-to-twitter-bot).

\`/auth\`
Start the process to link your Twitter account to this bot.
If you want to change your Twitter account, you'll need to call \`/auth\` again.

\`/link @<channel>\`
Link your Twitter account to a Telegram channel.
You'll need to call /auth first.
If you want to change your Telegram channel, you'll need to call /link again.
Don't forget to also add this bot as an admin in your Telegram channel.

\`/help\`
Show this help message.

➡️ If you just got here and are unsure what to do, just call /auth to get started.
  `,
    {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }
  );
};
