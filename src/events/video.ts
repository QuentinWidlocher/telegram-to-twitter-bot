import { lookup } from "mime-types";
import { Stream } from "stream";
import invariant from "tiny-invariant";
import { OnEvent } from "../events";
import { retreive } from "../utils/storage";
import { sendMessage } from "../utils/telegram-api";
import { getClientFromUserData, streamToBuffer } from "../utils/twitter-api";

export const getVideoEvent: OnEvent<"video"> = (bot) => async (msg) => {
  invariant(msg.video, "msg.video is required");
  invariant(msg.from?.id, "msg.from.id is required");

  const loadingMessage = await bot.sendMessage(
    msg.from.id,
    `📤 Sending message...`
  );

  const message = msg.text ?? msg.caption ?? "";

  let userData = await retreive(msg.from.id);
  invariant(userData.channelId, "userData.channelId is required");

  let twitterClient = await getClientFromUserData(userData);

  let tgMediaFile = await bot.getFile(msg.video.file_id);
  console.debug("tgMediaFile", tgMediaFile);
  let tgMediaBuffer = await {
    buffer: await streamToBuffer(bot.getFileStream(tgMediaFile.file_id)),
    originalName: tgMediaFile.file_path,
  };

  const mediaId = await twitterClient.v1.uploadMedia(tgMediaBuffer.buffer, {
    mimeType: lookup(tgMediaBuffer.originalName ?? "mp4") || "video/mp4",
  });

  await sendMessage(
    bot,
    message,
    msg.from.id,
    userData.channelId,
    userData.twitterUsername,
    twitterClient,
    loadingMessage,
    {
      buffer: tgMediaBuffer.buffer,
      mediaId,
      mediaType: "video",
    }
  );
};
