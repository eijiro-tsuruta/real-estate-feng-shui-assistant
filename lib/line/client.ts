import { MAX_IMAGE_BYTES, validateImageBytes } from "../file-validation";

const LINE_CONTENT_BASE_URL = "https://api-data.line.me/v2/bot/message";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

type LineReplyMessage = {
  type: "text";
  text: string;
  quickReply?: {
    items: Array<{
      type: "action";
      action: {
        type: "postback";
        label: string;
        data: string;
        displayText: string;
      };
    }>;
  };
};

export function buildLineMenuMessage(): LineReplyMessage {
  return {
    type: "text",
    text: "ご希望のメニューを選んでください。",
    quickReply: {
      items: [
        ["① 建物間取り風水", "building_feng_shui"],
        ["② お部屋の風水", "room_feng_shui"],
        ["③ 壁のイメージ", "wall_image"],
      ].map(([label, selection]) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label,
          data: `menu=${selection}`,
          displayText: label,
        },
      })),
    },
  };
}

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

async function replyLineMessages(
  replyToken: string,
  messages: LineReplyMessage[],
): Promise<void> {
  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });
  if (!response.ok) {
    throw new Error(`LINE reply failed with ${response.status}.`);
  }
}


export async function replyLineText(
  replyToken: string,
  text: string,
): Promise<void> {
  await replyLineMessages(replyToken, [{ type: "text", text }]);
}

export async function replyLineMenu(replyToken: string): Promise<void> {
  await replyLineMessages(replyToken, [buildLineMenuMessage()]);
}
