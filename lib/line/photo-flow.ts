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

export function buildPhotoReceiptMessage(direction: PhotoDirection): string {
  const next = nextDirections[direction];
  if (!next) {
    return `${directionLabels[direction]}の写真を安全に保存しました。\n4方向の写真が揃いました。担当者の確認後に診断結果をお届けします。`;
  }
  return `${directionLabels[direction]}の写真を安全に保存しました。\n次は${directionLabels[next]}を撮影して送ってください。`;
}
