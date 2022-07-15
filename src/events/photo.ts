import { lookup } from "mime-types";
import { Stream } from "stream";
import invariant from "tiny-invariant";
import { OnEvent } from "../events";
import { retreive } from "../utils/storage";
import { sendMessage } from "../utils/telegram-api";
import { getClientFromUserData } from "../utils/twitter-api";

async function streamToBuffer(stream: Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buffer = Array<any>();

    stream.on("data", (chunk) => buffer.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buffer)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  });
}

export const getPhotoEvent: OnEvent<"photo"> = (bot) => async (msg) => {
  invariant(msg.photo, "msg.photo is required");
  invariant(msg.from?.id, "msg.from.id is required");

  const message = msg.text ?? msg.caption ?? "";

  let userData = await retreive(msg.from.id);
  invariant(userData.channelId, "userData.channelId is required");

  let twitterClient = await getClientFromUserData(userData, msg.from.id);

  let tgMediaFile = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
  console.debug("tgMediaFile", tgMediaFile);
  let tgMediaBuffer = await {
    buffer: await streamToBuffer(bot.getFileStream(tgMediaFile.file_id)),
    originalName: tgMediaFile.file_path,
  };

  const mediaId = await twitterClient.v1.uploadMedia(tgMediaBuffer.buffer, {
    mimeType: lookup(tgMediaBuffer.originalName ?? "jpg") || "image/jpeg",
  });

  await sendMessage(
    bot,
    message,
    msg.from.id,
    userData.channelId,
    twitterClient,
    {
      buffer: tgMediaBuffer.buffer,
      mediaId,
    }
  );
};
