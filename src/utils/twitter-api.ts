import { TwitterApi } from "twitter-api-v2";

const baseClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
});

export async function startLogin(from: { userId: string | number, chatId: string | number }, client: TwitterApi = baseClient) {
  let url = new URL(process.env.REDIRECT_URL!)
  url.searchParams.set("userId", String(from.userId));
  url.searchParams.set("chatId", String(from.chatId));

  const authLink = await client.generateOAuth2AuthLink(url.toString(), {
    scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
  });

  return authLink;
}

export async function getClientFromLoginCode(
  code: string,
  codeVerifier: string,
  from: { userId: string | number, chatId: string | number },
  client: TwitterApi = baseClient
) {
  let redirectUri = new URL(process.env.REDIRECT_URL!)
  redirectUri.searchParams.set("userId", String(from.userId));
  redirectUri.searchParams.set("chatId", String(from.chatId));

  return client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: redirectUri.toString(),
  });
}

export async function getClient(refreshToken: string) {
  const { client } = await baseClient.refreshOAuth2Token(refreshToken);
  return client;
}