import { getLineRoomAdviceContext, saveLineRoomAdvice } from "../db/line-photo-repository";
import { requestOpenAIJson } from "../openai-json";
import { getPrivateObject } from "../object-storage";
import { roomAdviceSchema, type RoomAdvice } from "../room-advice-schema";
import { roomTypeLabel } from "./menu";

const directionLabels = {
  north: "北",
  east: "東",
  south: "南",
  west: "西",
} as const;

export async function generateLineRoomAdvice(lineUserId: string): Promise<{
  caseId: string;
  advice: RoomAdvice;
}> {
  const context = await getLineRoomAdviceContext(lineUserId);
  if (!context) {
    throw new Error("Room advice inputs are incomplete.");
  }

  const images = await Promise.all(
    context.images.map(async (image) => {
      const object = await getPrivateObject(image.objectKey);
      return {
        bytes: object.bytes,
        mediaType: image.mediaType,
        label: `${directionLabels[image.direction]}側の写真`,
      };
    }),
  );

  const roomLabel = roomTypeLabel(context.roomType);
  const prompt = `
添付した4枚は、一つの${roomLabel}を部屋の中央付近から北・東・南・西へ向けて撮影した写真です。
この機能は「お部屋の風水」です。間取り図解析や建物全体の診断ではありません。

厳守事項:
- 写真のラベルを方角として使用し、画像だけから方角を推測しない。
- この一室に写っている壁、窓、ドア、家具、床、色、明るさ、空きスペース、動線だけを扱う。
- 建物の中心、玄関、キッチン、浴室、トイレ、水回り、他の部屋を推測・評価しない。
- 空室の場合も、家具がないことを欠点にせず、これから何をどこへ置くとよいか提案する。
- 北・東・南・西ごとに、家具、観葉植物、照明、鏡、収納、カーテン、ラグ、色、素材から実行可能な提案を出す。
- 写真で確認できない物や設備があると断定しない。
- 一般的な風水の参考的な考え方として穏やかに説明し、効果や運勢を保証しない。
- 優先順位の高い改善を3件以内に絞る。
- プロが顧客へそのまま説明できる短い日本語にする。
- JSON以外は出力しない。
`.trim();

  const advice = await requestOpenAIJson({
    prompt,
    schema: roomAdviceSchema,
    images,
    maxTokens: 2200,
  });
  await saveLineRoomAdvice(context.caseId, advice);
  return { caseId: context.caseId, advice };
}

export function formatLineRoomAdvice(
  roomLabel: string,
  advice: RoomAdvice,
): string {
  const sections = [
    `【${roomLabel}の風水アドバイス】`,
    advice.summary,
    `\n■ 優先する改善\n${advice.priorities
      .map(
        (item, index) =>
          `${index + 1}. ${item.title}\n${item.action}\n理由：${item.reason}`,
      )
      .join("\n")}`,
    ...advice.directions.map(
      (item) =>
        `\n■ ${item.direction}側\n${item.observation}\n${item.recommendations.map((recommendation) => `・${recommendation}`).join("\n")}`,
    ),
  ];
  if (advice.colorsAndMaterials.length > 0) {
    sections.push(
      `\n■ 色・素材\n${advice.colorsAndMaterials.map((item) => `・${item}`).join("\n")}`,
    );
  }
  if (advice.lighting.length > 0) {
    sections.push(
      `\n■ 照明\n${advice.lighting.map((item) => `・${item}`).join("\n")}`,
    );
  }
  if (advice.avoid.length > 0) {
    sections.push(
      `\n■ 避けたい配置\n${advice.avoid.map((item) => `・${item}`).join("\n")}`,
    );
  }
  sections.push(`\n■ 顧客への説明例\n${advice.talkTrack}`);
  sections.push(
    "\n※一般的な風水の考え方に基づく参考提案です。効果や運勢を保証するものではありません。",
  );
  return sections.join("\n").slice(0, 4900);
}
