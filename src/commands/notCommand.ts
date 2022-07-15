import invariant from "tiny-invariant";
import { parseTweet } from "twitter-text";
import { Command } from "../commands";
import { retreive } from "../utils/storage";
import { getClientFromUserData } from "../utils/twitter-api";

export const getNotCommand: Command = (bot) => async (msg) => {
  console.log("msg", msg);
  invariant(msg.text, "msg.text is required");
  invariant(msg.from?.id, "msg.from.id is required");

  let userData = await retreive(msg.from.id);
  invariant(userData.channelId, "userData.channelId is required");

  if (!parseTweet(msg.text).valid) {
    await bot.sendMessage(msg.chat.id, `This message won't fit in a tweet.`);

    return;
  }

  let twitterClient = await getClientFromUserData(userData, msg.from.id);

  let [tgRes, twRes] = await Promise.all([
    bot.sendMessage(userData.channelId, msg.text),
    twitterClient.v2.tweet(msg.text),
  ]);

  if (twRes.errors) {
    console.error("twRes.errors", twRes.errors);
    await bot.sendMessage(
      userData.channelId,
      "Error: " + twRes.errors.join("\n")
    );

    return;
  }

  console.log("twRes.data", twRes.data);

  await bot.sendMessage(msg.from.id, "Message sent");
};
