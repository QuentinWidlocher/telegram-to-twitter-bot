import { app } from "./app";

export async function handler(event: Event & { body: string }) {
  console.log("event", event);

  try {
    await app(JSON.parse(event.body));
    return { statusCode: 200, body: JSON.stringify(event) };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: JSON.stringify(e) };
  }
}
