import {
  DeleteObjectCommand,
  GetObjectCommand,
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

export async function getPrivateObject(key: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> {
  const { bucket, client } = getStorageConfig();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!response.Body) throw new Error("Private object body is unavailable.");
  return {
    bytes: await response.Body.transformToByteArray(),
    contentType: response.ContentType ?? "application/octet-stream",
  };
}
