import { AWSError } from "aws-sdk";
import DB, { GetItemOutput } from "aws-sdk/clients/dynamodb";
import { PromiseResult } from "aws-sdk/lib/request";
import { fromPromise, Result, ResultAsync } from "neverthrow";

const db = new DB({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export type UserData = {
  credentials?: {
    oauthToken?: string;
    oauthTokenSecret?: string;
    accessToken?: string;
    accessSecret?: string;
    oauthVerifier?: string;
  };
  channelId?: string;
  twitterUsername?: string;
};

export async function update(userId: string | number, data: Partial<UserData>) {
  let existing = await retreive(userId);
  console.log("existing", existing);

  let newData: Result<UserData, string> = existing.map(it => ({
    ...it,
    ...data,
    credentials: {
      ...it.credentials,
      ...data.credentials,
    },
  }));

  return newData.asyncAndThen(it => store(userId, it));
}

export function store(userId: string | number, data: Partial<UserData>): ResultAsync<PromiseResult<DB.PutItemOutput, AWSError>, string> {
  return fromPromise(db
    .putItem({
      TableName: "telegram-to-twitter-bot",
      Item: {
        userId: { S: String(userId) },
        data: { S: JSON.stringify(data) },
      },
    })
    .promise(), () => "Error storing data");
}

export function retreive(userId: string | number): ResultAsync<UserData, string> {
  return fromPromise(db
    .getItem({
      TableName: "telegram-to-twitter-bot",
      Key: { userId: { S: String(userId) } },
    })
    .promise()
    .then((data) => {
      return JSON.parse(
        (data.$response.data as GetItemOutput | undefined)?.Item?.data?.S ??
        "{}"
      );
    }), () => "Error retrieving data");
}
