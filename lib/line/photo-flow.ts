import { createHash } from "node:crypto";
import type { AllowedImageType } from "../file-validation";
import type { PhotoDirection, ProfessionalCase } from "../professional-case";

const directionLabels: Record<PhotoDirection, string> = {
  north: "北側",
  east: "東側",
  south: "南側",
  west: "西側",
};

const nextDirections: Partial<Record<PhotoDirection, PhotoDirection>> = {
  north: "east",
  east: "south",
  south: "west",
};

const retakeCommands = new Set([
  "撮り直し",
  "撮り直す",
  "取り直し",
  "取り直す",
  "やり直し",
  "一つ戻る",
  "ひとつ戻る",
]);

export function directionFromCaseStatus(
  status: ProfessionalCase["status"],
): PhotoDirection | null {
  const match = /^awaiting_(north|east|south|west)_photo$/.exec(status);
  return (match?.[1] as PhotoDirection | undefined) ?? null;
}

export function buildLinePhotoObjectKey(args: {
  lineUserId: string;
  caseId: string;
  direction: PhotoDirection;
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
  return `line/${userHash}/${args.caseId}/${args.direction}/${args.assetId}.${extension}`;
}

export function buildPhotoReceiptMessage(
  direction: PhotoDirection,
  nextDirection: PhotoDirection | null = nextDirections[direction] ?? null,
): string {
  const next = nextDirection;
  if (!next) {
    return `${directionLabels[direction]}の写真を安全に保存しました。\n4方向の写真が揃い、診断の受付が完了しました。\n担当者の確認後、このLINEに診断結果をお届けします。お客様の操作はここで完了です。`;
  }
  return `${directionLabels[direction]}の写真を安全に保存しました。\n次は${directionLabels[next]}を撮影して送ってください。\n写真を間違えた場合は「撮り直し」と送ってください。`;
}

export function isPhotoRetakeCommand(text: string): boolean {
  return retakeCommands.has(text.normalize("NFKC").trim());
}

export function buildPhotoRetakeMessage(direction: PhotoDirection): string {
  return `${directionLabels[direction]}の写真を取り消しました。\n${directionLabels[direction]}をもう一度撮影して送ってください。`;
}
