import { Handler } from "@netlify/functions";
import { Event } from "@netlify/functions/dist/function/event";
import { ResultAsync } from "neverthrow";

export function createHandled(handler: (event: Event) => ResultAsync<void, string>): Handler {
  let handled: Handler = async (event) => {
    let result = await handler(event);
    if (result.isErr()) {
      return {
        statusCode: 500,
        body: result.error,
      };
    } else {
      return {
        statusCode: 200,
        body: "ok",
      };
    }
  };

  return handled;
}