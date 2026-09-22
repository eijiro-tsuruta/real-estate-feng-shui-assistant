import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type StorageConfig = {
  bucket: string;
  client: S3Client;
};

let storageConfig: StorageConfig | undefined;

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getStorageConfig(): StorageConfig {
  storageConfig ??= {
    bucket: requiredEnvironmentValue("NEON_STORAGE_BUCKET"),
    client: new S3Client({
      endpoint: requiredEnvironmentValue("AWS_ENDPOINT_URL_S3"),
      region: requiredEnvironmentValue("AWS_REGION"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: requiredEnvironmentValue("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnvironmentValue("AWS_SECRET_ACCESS_KEY"),
      },
    }),
  };
  return storageConfig;
}

export async function putPrivateObject(args: {
  key: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<void> {
  const { bucket, client } = getStorageConfig();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: args.key,
      Body: args.bytes,
      ContentType: args.contentType,
      CacheControl: "private, no-store",
    }),
  );
}

export async function deletePrivateObject(key: string): Promise<void> {
  const { bucket, client } = getStorageConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
