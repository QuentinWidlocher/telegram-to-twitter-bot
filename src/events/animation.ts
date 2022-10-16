import { lookup } from "mime-types";
import { err, fromPromise, ok } from "neverthrow";
import { EventData, OnEvent } from "../events";
import { retreive } from "../utils/storage";
import { getClientFromUserData, streamToBuffer } from "../utils/twitter-api";

export const getAnimationEvent: OnEvent = (bot) => async (msg) => {
  if (!msg.animation) {
    return err("msg.animation is required");
  }

  if (!msg.from?.id) {
    return err("msg.from.id is required");
  }

  const loadingMessage = await fromPromise(bot.sendMessage(
    msg.from.id,
    `📤 Sending message...`
  ), () => "Error sending message to Telegram");

  if (loadingMessage.isErr()) {
    return err(loadingMessage.error)
  }

  const message = msg.text ?? msg.caption ?? "";

  let userData = await retreive(msg.from.id);

  if (userData.isErr()) {
    return err(userData.error)
  }

  if (!userData.value.channelId) {
    return err("userData?.channelId is required");
  }

  let twitterClient = await getClientFromUserData(userData.value);

  if (twitterClient.isErr()) {
    return err(twitterClient.error)
  }

  let telegramMediaFile = await fromPromise(bot.getFile(msg.animation.file_id), () => "Error getting file from Telegram");

  if (telegramMediaFile.isErr()) {
    return err(telegramMediaFile.error);
  }

  let buffer = await streamToBuffer(bot.getFileStream(telegramMediaFile.value.file_id))

  if (buffer.isErr()) {
    return err(buffer.error);
  }

  let tgMediaBuffer = await {
    buffer: buffer.value,
    originalName: telegramMediaFile.value.file_path,
  };

  const twitterMediaId = await twitterClient.value.v1.uploadMedia(tgMediaBuffer.buffer, {
    mimeType: lookup(tgMediaBuffer.originalName ?? "gif") || "image/gif",
  });

  return ok({
    bot,
    message,
    msgFromId: msg.from.id,
    channelId: userData.value.channelId,
    twitterUsername: userData.value.twitterUsername,
    twitterClient: twitterClient.value,
    loadingMessage: loadingMessage.value,
    media: {
      telegramMediaFile: telegramMediaFile.value,
      buffer: tgMediaBuffer.buffer,
      twitterMediaId,
      mediaType: "animation",
    }
  } as EventData);
};
