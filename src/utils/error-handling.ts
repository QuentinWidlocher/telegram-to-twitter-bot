import { Handler } from "@netlify/functions";
import { Event } from "@netlify/functions/dist/function/event";

export function createHandled(handler: (event: Event) => Promise<void>): Handler {
  let handled: Handler = async (event) => {
    try {
      await handler(event);
      return { statusCode: 200 };
    } catch (e) {
      console.error("handled", e);
      return {
        statusCode: 500,
      }
    }
  };

  return handled;
}