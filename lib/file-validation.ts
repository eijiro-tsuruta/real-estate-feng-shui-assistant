export const MAX_IMAGE_BYTES = 4_000_000;
export const MAX_REQUEST_BYTES = 4_400_000;

export const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof allowedImageTypes)[number];

function matchesSignature(bytes: Uint8Array, type: AllowedImageType): boolean {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export async function validateImage(file: File): Promise<{
  bytes: Uint8Array;
  mediaType: AllowedImageType;
}> {
  if (!allowedImageTypes.includes(file.type as AllowedImageType)) {
    throw new Error("JPEG、PNG、WebPの画像を選択してください。");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("画像サイズは4MB以下にしてください。");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = file.type as AllowedImageType;
  if (!matchesSignature(bytes, mediaType)) {
    throw new Error("画像の形式を確認できませんでした。別の画像を選択してください。");
  }
  return { bytes, mediaType };
}
