import { resolve } from "dns";
import { lookup } from "mime-types";
import { Stream } from "stream";
import invariant from "tiny-invariant";
import { parseTweet } from "twitter-text";
import { OnEvent } from "../events";
import { retreive } from "../utils/storage";
import { getClientFromUserData } from "../utils/twitter-api";

async function streamToBuffer(stream: Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();

    stream.on("data", (chunk) => _buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(_buf)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  });
}

export const getPhotoEvent: OnEvent<"photo"> = (bot) => async (msg) => {
  invariant(msg.photo, "msg.photo is required");
  invariant(msg.from?.id, "msg.from.id is required");

  const message = msg.text ?? msg.caption;

  invariant(message, "message is required");

  if (!parseTweet(message).valid) {
    await bot.sendMessage(msg.chat.id, `This message won't fit in a tweet.`);

    return;
  }

  let tgMediaFile = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
  console.debug("tgMediaFile", tgMediaFile);
  let tgMediaBuffer = await {
    buffer: await streamToBuffer(bot.getFileStream(tgMediaFile.file_id)),
    originalName: tgMediaFile.file_path,
  };
  console.log("tgMediaBuffer", tgMediaBuffer);

  let userData = await retreive(msg.from.id);
  invariant(userData.channelId, "userData.channelId is required");
  let twitterClient = await getClientFromUserData(userData, msg.from.id);

  const mediaId = await twitterClient.v1.uploadMedia(tgMediaBuffer.buffer, {
    mimeType: lookup(tgMediaBuffer.originalName ?? "jpg") || "image/jpeg",
  });

  console.debug("mediaId", mediaId);

  let [tgRes, twRes] = await Promise.all([
    bot.sendPhoto(userData.channelId, tgMediaBuffer.buffer, {
      caption: message,
    }),
    twitterClient.v2.tweet(message, {
      media: {
        media_ids: [mediaId],
      },
    }),
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
