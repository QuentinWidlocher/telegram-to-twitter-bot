import DB, { GetItemOutput } from "aws-sdk/clients/dynamodb";

const db = new DB({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export type UserData = {
  credentials?: {
    refreshToken?: string
    code?: string
    codeVerifier?: string
  },
  channelId?: string
};

export async function update(userId: string | number, data: Partial<UserData>) {
  let existing = await retreive(userId);
  console.log("existing", existing);

  let newData: UserData = {
    ...existing,
    ...data,
    credentials: {
      ...existing.credentials,
      ...data.credentials,
    }
  };

  console.log("newData", newData);

  await store(userId, newData);
}

export async function store(userId: string | number, data: Partial<UserData>) {
  await db
    .putItem({
      TableName: "telegram-to-twitter-bot",
      Item: {
        userId: { S: String(userId) },
        data: { S: JSON.stringify(data) },
      },
    })
    .promise();
}

export async function retreive(userId: string | number): Promise<UserData> {
  console.log("retreive", userId, db);
  return db
    .getItem({
      TableName: "telegram-to-twitter-bot",
      Key: { userId: { S: String(userId) } },
    }).promise()
    .then((data) => {
      console.log("retreived", data);
      return JSON.parse(
        (data.$response.data as GetItemOutput | undefined)?.Item?.data?.S ??
        "{}"
      )
    }).catch((e) => {
      console.error("retreive error", e);
      return {};
    });
}
