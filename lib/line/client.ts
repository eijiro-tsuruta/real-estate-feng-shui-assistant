import { MAX_IMAGE_BYTES, validateImageBytes } from "../file-validation";

const LINE_CONTENT_BASE_URL = "https://api-data.line.me/v2/bot/message";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

function getAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured.");
  return token;
}

export async function fetchLineImage(messageId: string) {
  const response = await fetch(
    `${LINE_CONTENT_BASE_URL}/${encodeURIComponent(messageId)}/content`,
    { headers: { Authorization: `Bearer ${getAccessToken()}` } },
  );
  if (!response.ok) {
    throw new Error(`LINE image download failed with ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error("画像サイズは4MB以下にしてください。");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return validateImageBytes(
    bytes,
    response.headers.get("content-type") ?? "application/octet-stream",
  );
}

export async function replyLineText(
  replyToken: string,
  text: string,
): Promise<void> {
  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  if (!response.ok) {
    throw new Error(`LINE reply failed with ${response.status}.`);
  }
}
