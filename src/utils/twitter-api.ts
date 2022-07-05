import { TwitterApi } from "twitter-api-v2";
import * as readline from "readline";
import { stdin as input, stdout as output } from "process";

async function startLogin(client: TwitterApi) {
  const authLink = await client.generateOAuth2AuthLink("https://example.com", {
    scope: ["tweet.read", "tweet.write", "users.read"],
  });

  return authLink;
}

async function getClientFromLoginCode(
  code: string,
  codeVerifier: string,
  client: TwitterApi
) {
  const { client: authorizedClient } = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: "https://example.com",
  });

  return authorizedClient;
}

async function cliLogin(): Promise<TwitterApi> {
  const baseClient = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

  let { url, codeVerifier } = await startLogin(baseClient);

  return new Promise((resolve) => {
    readline
      .createInterface({ input, output })
      .question(
        `Visit ${url} and enter the code you received here:\t`,
        async (code) => {
          const client = await getClientFromLoginCode(
            code,
            codeVerifier,
            baseClient
          );
          resolve(client);
        }
      );
  });
}

export async function testTwitter() {
  let client = await cliLogin();

  client.v2.tweet({
    text: "Hello, world!",
  });
}
