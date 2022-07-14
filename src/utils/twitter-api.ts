import { TwitterApi } from "twitter-api-v2";

const baseClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  // appKey: process.env.TWITTER_APP_KEY!,
  // appSecret: process.env.TWITTER_APP_SECRET!,
});

export async function startLogin(from: { userId: string | number, chatId: string | number }, client: TwitterApi = baseClient) {
  let url = new URL(process.env.REDIRECT_URL!)
  url.searchParams.set("userId", String(from.userId));
  url.searchParams.set("chatId", String(from.chatId));

  const authLink = await client.generateOAuth2AuthLink(url.toString(), {
    scope: ['users.read', 'tweet.read', 'tweet.write', 'offline.access'],
  });

  return authLink;
}

export async function generateOauthClient(code: string, codeVerifier: string, from: { userId: string | number, chatId: string | number }) {
  let url = new URL(process.env.REDIRECT_URL!)
  url.searchParams.set("userId", String(from.userId));
  url.searchParams.set("chatId", String(from.chatId));

  return baseClient.loginWithOAuth2({ code, codeVerifier, redirectUri: url.toString() })
}

export async function getClient(refreshToken: string) {
  return baseClient.refreshOAuth2Token(refreshToken)
}