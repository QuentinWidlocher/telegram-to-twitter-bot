import TelegramBot from "node-telegram-bot-api";
import { Stream } from "stream";
import invariant from "tiny-invariant";
import { TwitterApi } from "twitter-api-v2";
import { retreive, store, UserData } from "./storage";

const baseClient = new TwitterApi({
  // clientId: process.env.TWITTER_CLIENT_ID!,
  // clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  appKey: process.env.TWITTER_APP_KEY!,
  appSecret: process.env.TWITTER_APP_SECRET!,
});

export async function startLogin(
  from: { userId: string | number; chatId: string | number },
  client: TwitterApi = baseClient
) {
  let url = new URL(process.env.REDIRECT_URL!);
  url.searchParams.set("userId", String(from.userId));
  url.searchParams.set("chatId", String(from.chatId));

  const authLink = await client.generateAuthLink(url.toString(), {
    linkMode: "authorize",
  });

  return authLink;
}

export async function generateOauthClient(
  accessToken: string,
  accessSecret: string,
  oauthVerifier: string
) {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY!,
    appSecret: process.env.TWITTER_APP_SECRET!,
    accessToken,
    accessSecret,
  });

  return client.login(oauthVerifier);
}

export async function generateClient(
  accessToken: string,
  accessSecret: string,
  oauthVerifier: string
) {
  return new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY!,
    appSecret: process.env.TWITTER_APP_SECRET!,
    accessToken,
    accessSecret,
  });
}

export async function getClientFromUserData(
  userData: UserData,
  userId: string | number
) {
  invariant(
    userData?.credentials?.accessToken,
    "userData.credentials.accessToken is required"
  );
  invariant(
    userData?.credentials?.accessSecret,
    "userData.credentials.accessSecret is required"
  );
  invariant(
    userData?.credentials?.oauthVerifier,
    "userData.credentials.oauthVerifier is required"
  );
  invariant(userData.channelId, "userData.channelId is required");

  return generateClient(
    userData.credentials.accessToken,
    userData.credentials.accessSecret,
    userData.credentials.oauthVerifier
  );
}

export async function getClient(userId: string | number) {
  let userData = await retreive(userId);
  return getClientFromUserData(userData, userId);
}

export async function streamToBuffer(stream: Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buffer = Array<any>();

    stream.on("data", (chunk) => buffer.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buffer)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  });
}
