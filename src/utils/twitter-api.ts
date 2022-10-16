import { ok, err, fromPromise, fromThrowable, Result, ResultAsync } from "neverthrow";
import { Stream } from "stream";
import { LoginResult, TwitterApi } from "twitter-api-v2";
import { retreive, UserData } from "./storage";

const baseClient = new TwitterApi({
  // clientId: process.env.TWITTER_CLIENT_ID!,
  // clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  appKey: process.env.TWITTER_APP_KEY!,
  appSecret: process.env.TWITTER_APP_SECRET!,
});

export async function startLogin(
  from: { userId: string | number; chatId: string | number },
  client: TwitterApi = baseClient
): Promise<Result<{
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: "true";
  url: string;
}, string>> {
  let url = new URL(process.env.REDIRECT_URL!);
  url.searchParams.set("userId", String(from.userId));
  url.searchParams.set("chatId", String(from.chatId));

  const authLink = await fromPromise(client.generateAuthLink(url.toString(), {
    linkMode: "authorize",
  }), () => "Error generating auth link");

  return authLink;
}

export async function generateOauthClient(
  accessToken: string,
  accessSecret: string,
  oauthVerifier: string
): Promise<Result<LoginResult, string>> {
  const client = fromThrowable(() => new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY!,
    appSecret: process.env.TWITTER_APP_SECRET!,
    accessToken,
    accessSecret,
  }), () => "Error creating Twitter API client");

  return client().asyncMap(it => it.login(oauthVerifier));
}

export function generateClient(
  accessToken: string,
  accessSecret: string
) {
  return new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY!,
    appSecret: process.env.TWITTER_APP_SECRET!,
    accessToken,
    accessSecret,
  });
}

export function getClientFromUserData(userData: UserData): Result<TwitterApi, string> {
  if (!userData?.credentials?.accessToken) {
    return err("No access token found");
  }

  if (!userData?.credentials?.accessSecret) {
    return err("No access secret found");
  }

  if (!userData.channelId) {
    return err("No channel ID found");
  }

  return ok(generateClient(
    userData.credentials.accessToken,
    userData.credentials.accessSecret
  ))
}

export async function getClient(userId: string | number) {
  let userData = retreive(userId);
  return userData.map(it => getClientFromUserData(it));
}

export function streamToBuffer(stream: Stream): ResultAsync<Buffer, string> {
  return fromPromise(new Promise<Buffer>((resolve, reject) => {
    const buffer = Array<any>();

    stream.on("data", (chunk) => buffer.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buffer)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  }), e => e as string);
}
