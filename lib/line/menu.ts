import { createHash } from "node:crypto";
import type { AllowedImageType } from "../file-validation";

export const lineMenuSelections = [
  "building_feng_shui",
  "room_feng_shui",
  "wall_image",
] as const;

export type LineMenuSelection = (typeof lineMenuSelections)[number];
export type LineMenuStep =
  | "awaiting_floorplan"
  | "awaiting_room_type"
  | "awaiting_room_photo"
  | "awaiting_wall_photo"
  | "awaiting_wall_style"
  | "complete";

export type LineIntakeAssetKind = "floorplan" | "wall" | "wallpaper";
export const roomTypes = [
  "living_room",
  "bedroom",
  "home_office",
  "child_room",
  "other",
] as const;
export type RoomType = (typeof roomTypes)[number];

export type PhotoChangePostback = "start" | "north" | "east" | "south" | "west";

const menuCommands = new Set([
  "メニュー",
  "最初に戻る",
  "最初から",
  "はじめに戻る",
]);

export function isLineMenuCommand(text: string): boolean {
  return menuCommands.has(text.normalize("NFKC").trim());
}

export function parseLineMenuPostback(
  data: string | undefined,
): LineMenuSelection | null {
  if (!data) return null;
  const match = /^menu=(building_feng_shui|room_feng_shui|wall_image)$/.exec(
    data,
  );
  return (match?.[1] as LineMenuSelection | undefined) ?? null;
}

export function isLineMenuOpenPostback(data: string | undefined): boolean {
  return data === "menu=open";
}

export function isRoomAdvicePostback(data: string | undefined): boolean {
  return data === "room_advice=start";
}

export function parsePhotoChangePostback(
  data: string | undefined,
): PhotoChangePostback | null {
  if (!data) return null;
  const match = /^photo_change=(start|north|east|south|west)$/.exec(data);
  return (match?.[1] as PhotoChangePostback | undefined) ?? null;
}

export function parseRoomTypePostback(data: string | undefined): RoomType | null {
  if (!data) return null;
  const match = /^room_type=(living_room|bedroom|home_office|child_room|other)$/.exec(
    data,
  );
  return (match?.[1] as RoomType | undefined) ?? null;
}

export function roomTypeLabel(roomType: RoomType): string {
  return {
    living_room: "リビング",
    bedroom: "寝室",
    home_office: "仕事部屋",
    child_room: "子ども部屋",
    other: "その他の部屋",
  }[roomType];
}

export function initialStepForMenu(
  selection: LineMenuSelection,
): LineMenuStep {
  return {
    building_feng_shui: "awaiting_floorplan",
    room_feng_shui: "awaiting_room_type",
    wall_image: "awaiting_wall_photo",
  }[selection] as LineMenuStep;
}

export function buildLineIntakeObjectKey(args: {
  lineUserId: string;
  kind: LineIntakeAssetKind;
  assetId: string;
  mediaType: AllowedImageType;
}): string {
  const userHash = createHash("sha256")
    .update(args.lineUserId)
    .digest("hex")
    .slice(0, 24);
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[args.mediaType];
  return `line-intake/${userHash}/${args.kind}/${args.assetId}.${extension}`;
}

export function buildMenuSelectionMessage(selection: LineMenuSelection): string {
  if (selection === "building_feng_shui") {
    return "建物間取り風水ですね。\n建物の間取り図をアップしてください。";
  }
  if (selection === "room_feng_shui") {
    return "お部屋の風水ですね。\n診断する一つの部屋を選んでください。";
  }
  return "壁のイメージですね。\nイメージを変更したい壁の写真をアップしてください。";
}
