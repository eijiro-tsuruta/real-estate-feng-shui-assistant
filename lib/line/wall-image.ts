import { createHash, randomUUID } from "node:crypto";
import {
  getLineIntakeAsset,
  saveLineIntakeAsset,
} from "../db/line-menu-repository";
import { requestOpenAIImageEdit } from "../openai-image-edit";
import {
  deletePrivateObject,
  getPrivateObject,
  putPrivateObject,
} from "../object-storage";
import { buildLineIntakeObjectKey } from "./menu";
import { pushLineImage, pushLineText } from "./client";
import { wallTargetLabel, type WallImageState } from "./wall-image-flow";

export async function generateAndDeliverWallImage(args: {
  lineUserId: string;
  state: WallImageState;
  origin: string;
}): Promise<void> {
  if (!args.state.target || !args.state.method) {
    throw new Error("Wall image choices are incomplete.");
  }
  const wallAsset = await getLineIntakeAsset(args.lineUserId, "wall");
  if (!wallAsset) throw new Error("Wall image is unavailable.");
  const wall = await getPrivateObject(wallAsset.objectKey);
  const images = [
    {
      bytes: wall.bytes,
      mediaType: wallAsset.mediaType,
      label: `編集対象：${wallTargetLabel(args.state.target)}`,
    },
  ];
  if (args.state.method === "reference") {
    const referenceAsset = await getLineIntakeAsset(
      args.lineUserId,
      "wallpaper",
    );
    if (!referenceAsset) throw new Error("Reference image is unavailable.");
    const reference = await getPrivateObject(referenceAsset.objectKey);
    images.push({
      bytes: reference.bytes,
      mediaType: referenceAsset.mediaType,
      label: "色・柄・雰囲気の参考画像",
    });
  }
  const request =
    args.state.method === "words"
      ? `希望イメージ：${args.state.description || "自然で調和する仕上がり"}`
      : args.state.method === "reference"
        ? "参考画像の色・柄・雰囲気を参考にする。完全複製ではなく自然に調整する。"
        : "建物や空間に自然に調和する、落ち着いたプロ向けの仕上がりを提案する。";
  const prompt = `${wallTargetLabel(args.state.target)}だけを変更してください。${request}
元写真の構図、寸法、家具、窓、屋根、床、植栽、ドア枠、取っ手、ガラス、照明、影を維持してください。指定部分以外は変更しないでください。光、影、反射、凹凸、目地、素材感を残し、写真として自然で現実的な完成イメージにしてください。文字や説明を画像内に追加しないでください。`;
  const generated = await requestOpenAIImageEdit({ prompt, images });
  const id = randomUUID();
  const objectKey = buildLineIntakeObjectKey({
    lineUserId: args.lineUserId,
    kind: "wall_result",
    assetId: id,
    mediaType: generated.mediaType,
  });
  await putPrivateObject({
    key: objectKey,
    bytes: generated.bytes,
    contentType: generated.mediaType,
  });
  let saved: Awaited<ReturnType<typeof saveLineIntakeAsset>>;
  try {
    saved = await saveLineIntakeAsset({
      id,
      lineUserId: args.lineUserId,
      kind: "wall_result",
      objectKey,
      mediaType: generated.mediaType,
      byteSize: generated.bytes.byteLength,
      sha256: createHash("sha256").update(generated.bytes).digest("hex"),
    });
  } catch (error) {
    await deletePrivateObject(objectKey).catch(() => undefined);
    throw error;
  }
  if (saved.previousObjectKey && saved.previousObjectKey !== objectKey) {
    await deletePrivateObject(saved.previousObjectKey).catch(() => undefined);
  }
  const imageUrl = `${args.origin}/api/line/generated/${saved.assetId}`;
  await pushLineImage(args.lineUserId, imageUrl);
  await pushLineText(
    args.lineUserId,
    "完成イメージです。\n※実際の色味は照明、天候、撮影環境、画面設定、素材によって異なります。最終決定は現物サンプルでご確認ください。",
  );
}
