import { TwitterApi } from "twitter-api-v2";

const baseClient = new TwitterApi({
  // clientId: process.env.TWITTER_CLIENT_ID!,
  // clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  appKey: process.env.TWITTER_APP_KEY!,
  appSecret: process.env.TWITTER_APP_SECRET!,
});

export async function startLogin(from: { userId: string | number, chatId: string | number }, client: TwitterApi = baseClient) {
  let url = new URL(process.env.REDIRECT_URL!)
  url.searchParams.set("userId", String(from.userId));
  url.searchParams.set("chatId", String(from.chatId));

  const authLink = await client.generateAuthLink(url.toString(), {
    authAccessType: 'write',
    screenName: 'Telegram to Twitter Bot',
  });

  return authLink;
}

export async function getClient(accessToken: string, accessSecret: string, oauthVerifier: string,) {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY!,
    appSecret: process.env.TWITTER_APP_SECRET!,
    accessToken,
    accessSecret,
  });

  return client.login(oauthVerifier);
}