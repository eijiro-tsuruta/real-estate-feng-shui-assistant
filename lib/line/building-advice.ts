import { generateFloorPlanReport } from "../floorplan-report";
import {
  REPORT_DISCLAIMER,
  type FengShuiReport,
} from "../report-schema";

export async function generateLineBuildingAdvice(image: {
  bytes: Uint8Array;
  mediaType: string;
}): Promise<FengShuiReport> {
  return generateFloorPlanReport({
    ...image,
    propertyName: "LINEで受け付けた物件",
    northOverride: "auto",
  });
}

export function formatLineBuildingAdvice(report: FengShuiReport): string {
  const sections = [
    "【建物間取り風水の診断】",
    report.propertySummary,
    `\n■ 方位の確認（確信度：${report.reading.confidence}）\n${report.reading.north}`,
    `\n■ 間取りの読み取り\n${report.reading.summary}`,
    `\n■ 方位ごとの配置\n${report.placements
      .map((item) => `・${item.direction}：${item.rooms.join("、")}`)
      .join("\n")}`,
    `\n■ 金運の見立て\n${report.money.headline}\n${report.money.reading}\n${report.money.actions
      .map((item) => `・${item}`)
      .join("\n")}`,
    `\n■ 良い点\n${report.positives
      .map((item) => `・${item.title}：${item.explanation}`)
      .join("\n")}`,
  ];

  if (report.concerns.length > 0) {
    sections.push(
      `\n■ 気になる点と改善策\n${report.concerns
        .map(
          (item) =>
            `・${item.title}：${item.explanation}\n  改善：${item.remedies.join("／")}`,
        )
        .join("\n")}`,
    );
  }

  sections.push(`\n■ 顧客への説明例\n${report.talkTrack}`);
  sections.push(`\n※${REPORT_DISCLAIMER}`);
  return sections.join("\n").slice(0, 4900);
}
