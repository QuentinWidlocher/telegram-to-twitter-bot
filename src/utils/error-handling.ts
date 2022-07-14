import { Handler } from "@netlify/functions";

export function createHandled(handler: Handler): Handler {
  let handled: Handler = async (...args) => {
    try {
      await handler(...args);
    } catch (e) {
      console.error(e);
      return {
        statusCode: 500,
      }
    } finally {
      console.log("handled");
      return { statusCode: 200 };
    }
  };

  return handled;
}