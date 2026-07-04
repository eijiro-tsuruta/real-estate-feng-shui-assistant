import { z } from "zod";

export const northOverrideSchema = z.enum([
  "auto",
  "up",
  "upRight",
  "right",
  "downRight",
  "down",
  "downLeft",
  "left",
  "upLeft",
]);

export type NorthOverride = z.infer<typeof northOverrideSchema>;

const directionLabels: Record<Exclude<NorthOverride, "auto">, string> = {
  up: "図面の上",
  upRight: "図面の右上",
  right: "図面の右",
  downRight: "図面の右下",
  down: "図面の下",
  downLeft: "図面の左下",
  left: "図面の左",
  upLeft: "図面の左上",
};

export function getNorthInstruction(northOverride: NorthOverride): string {
  if (northOverride !== "auto") {
    return [
      `営業担当者による手動指定: ${directionLabels[northOverride]}方向が北です。`,
      "この指定を画像認識より優先し、図面の中心から8方位を割り当ててください。",
      "reading.northには手動指定を利用したことを明記し、confidenceは「高」にしてください。",
    ].join("");
  }

  return [
    "評価を始める前に、北方向の確認だけを独立した最初の作業として行ってください。",
    "間取りの内側だけでなく、図面の上端・右端・下端・左端、四隅、住戸外枠の外側、余白まで順番に確認してください。",
    "「N」「北」の文字、方位磁針、円形記号、上向きとは限らない矢印を探し、矢印の先端が示す向きを北として扱ってください。",
    "赤・緑・青などの色付き矢印、番号付きの吹き出し、寸法説明、動線表示は注釈であり、方位を示すものとして扱わないでください。",
    "方位磁針では、Nの文字に対応する黒い針または黒く塗られた三角形の先端を優先してください。",
    "北が斜めを向く場合は上下左右のどれかへ丸めず、「左上」「右上」「右下」「左下」を含む8方向のうち最も近い向きとして扱い、そこから8方位を回転させてください。",
    "小さな記号も見落とさないでください。",
    "それでも確認できない場合だけ方位不明とし、推測で補わずconfidenceを「低」にしてください。",
  ].join("");
}
