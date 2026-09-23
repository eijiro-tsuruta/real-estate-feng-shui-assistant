import { MAX_IMAGE_BYTES, validateImageBytes } from "../file-validation";
import type { PhotoDirection } from "../professional-case";
import { roomTypeLabel, roomTypes } from "./menu";
import { wallTargetLabel, wallTargets } from "./wall-image-flow";

const LINE_CONTENT_BASE_URL = "https://api-data.line.me/v2/bot/message";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

type LineTextMessage = {
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
type LineMessage =
  | LineTextMessage
  | {
      type: "image";
      originalContentUrl: string;
      previewImageUrl: string;
    };

export function buildLineMenuMessage(): LineTextMessage {
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

export function buildLinePhotoCompletionMessage(text: string): LineTextMessage {
  return {
    type: "text",
    text,
    quickReply: {
      items: [
        ["アドバイスを作成", "room_advice=start"],
        ["写真を変更する", "photo_change=start"],
        ["メニューに戻る", "menu=open"],
      ].map(([label, data]) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label,
          data,
          displayText: label,
        },
      })),
    },
  };
}

export function buildLineRoomTypeMessage(): LineTextMessage {
  return {
    type: "text",
    text: "診断する一つの部屋を選んでください。",
    quickReply: {
      items: roomTypes.map((roomType) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label: roomTypeLabel(roomType),
          data: `room_type=${roomType}`,
          displayText: roomTypeLabel(roomType),
        },
      })),
    },
  };
}

export function buildLineWallTargetMessage(): LineTextMessage {
  return {
    type: "text",
    text: "イメージを変更する場所を選んでください。",
    quickReply: {
      items: wallTargets.map((target) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label: wallTargetLabel(target),
          data: `wall_target=${target}`,
          displayText: wallTargetLabel(target),
        },
      })),
    },
  };
}

export function buildLineWallMethodMessage(): LineTextMessage {
  return {
    type: "text",
    text: "仕上がりの希望をどのように伝えますか？",
    quickReply: {
      items: [
        ["言葉でイメージを伝える", "wall_method=words"],
        ["参考画像を送る", "wall_method=reference"],
        ["AIに提案してもらう", "wall_method=ai"],
      ].map(([label, data]) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label,
          data,
          displayText: label,
        },
      })),
    },
  };
}

export function buildLineNorthConfirmationMessage(): LineTextMessage {
  return {
    type: "text",
    text: "方位マークを確認できませんでした。図面の上を北として診断してよいですか？",
    quickReply: {
      items: [
        ["はい、上が北です", "floorplan_north=up"],
        ["別の方向が北です", "floorplan_north=select"],
        ["方位がわかりません", "floorplan_north=assume_up"],
      ].map(([label, data]) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label,
          data,
          displayText: label,
        },
      })),
    },
  };
}

export function buildLineNorthDirectionMessage(): LineTextMessage {
  const directions = [
    ["上", "up"],
    ["右上", "upRight"],
    ["右", "right"],
    ["右下", "downRight"],
    ["下", "down"],
    ["左下", "downLeft"],
    ["左", "left"],
    ["左上", "upLeft"],
  ];
  return {
    type: "text",
    text: "北にあたる方向を選んでください。",
    quickReply: {
      items: directions.map(([label, direction]) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label,
          data: `floorplan_north=${direction}`,
          displayText: `北は${label}です`,
        },
      })),
    },
  };
}

export function buildLinePhotoChangeMessage(
  directions: PhotoDirection[],
): LineTextMessage {
  const labels: Record<PhotoDirection, string> = {
    north: "北の写真",
    east: "東の写真",
    south: "南の写真",
    west: "西の写真",
  };
  return {
    type: "text",
    text: "変更する写真を選んでください。",
    quickReply: {
      items: directions.map((direction) => ({
        type: "action" as const,
        action: {
          type: "postback" as const,
          label: labels[direction],
          data: `photo_change=${direction}`,
          displayText: `${labels[direction]}を変更する`,
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
  messages: LineMessage[],
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

async function pushLineMessages(
  lineUserId: string,
  messages: LineMessage[],
): Promise<void> {
  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: lineUserId,
      messages,
    }),
  });
  if (!response.ok) {
    throw new Error(`LINE push failed with ${response.status}.`);
  }
}

export async function replyLineText(
  replyToken: string,
  text: string,
): Promise<void> {
  await replyLineMessages(replyToken, [{ type: "text", text }]);
}

export async function pushLineText(
  lineUserId: string,
  text: string,
): Promise<void> {
  await pushLineMessages(lineUserId, [{ type: "text", text }]);
}

export async function pushLineImage(
  lineUserId: string,
  imageUrl: string,
): Promise<void> {
  await pushLineMessages(lineUserId, [
    {
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    },
  ]);
}

export async function pushLineNorthConfirmation(
  lineUserId: string,
): Promise<void> {
  await pushLineMessages(lineUserId, [buildLineNorthConfirmationMessage()]);
}

export async function replyLineNorthDirectionMenu(
  replyToken: string,
): Promise<void> {
  await replyLineMessages(replyToken, [buildLineNorthDirectionMessage()]);
}

export async function replyLineMenu(replyToken: string): Promise<void> {
  await replyLineMessages(replyToken, [buildLineMenuMessage()]);
}

export async function replyLineRoomTypeMenu(replyToken: string): Promise<void> {
  await replyLineMessages(replyToken, [buildLineRoomTypeMessage()]);
}

export async function replyLineWallTargetMenu(
  replyToken: string,
): Promise<void> {
  await replyLineMessages(replyToken, [buildLineWallTargetMessage()]);
}

export async function replyLineWallMethodMenu(
  replyToken: string,
): Promise<void> {
  await replyLineMessages(replyToken, [buildLineWallMethodMessage()]);
}

export async function replyLinePhotoCompletion(
  replyToken: string,
  text: string,
): Promise<void> {
  await replyLineMessages(replyToken, [buildLinePhotoCompletionMessage(text)]);
}

export async function replyLinePhotoChangeMenu(
  replyToken: string,
  directions: PhotoDirection[],
): Promise<void> {
  await replyLineMessages(replyToken, [buildLinePhotoChangeMessage(directions)]);
}
