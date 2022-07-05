import { TelegramRequestBody } from "./types";

export async function app(body: TelegramRequestBody) {
  console.log("body", body);
}
