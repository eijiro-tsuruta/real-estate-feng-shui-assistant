import assert from "node:assert/strict";
import test from "node:test";
import { reportSchema } from "../lib/report-schema";
import { sampleReport } from "../lib/sample-report";

const validReport = {
  propertySummary: "2LDKの住戸",
  reading: {
    north: "図面上部を北として読み取りました。",
    confidence: "高",
    summary: "玄関、LDK、洋室、水回りを確認しました。",
  },
  placements: [{ direction: "北", rooms: ["洋室"] }],
  positives: [
    {
      title: "明るいLDK",
      explanation: "一般的な風水の考え方では、明るさは心地よさにつながるとされます。",
      directions: ["南"],
    },
  ],
  concerns: [
    {
      title: "玄関の明るさ",
      explanation: "暗さが気になる場合があります。",
      directions: ["北"],
      remedies: ["照明を補い、清潔に保つ方法が紹介されています。"],
    },
  ],
  talkTrack: "良い点を活かしつつ、照明などの工夫もできます。",
} as const;

test("所定形式のレポートを受け付ける", () => {
  assert.equal(reportSchema.safeParse(validReport).success, true);
});

test("画面用サンプルレポートも本番スキーマを満たす", () => {
  assert.equal(reportSchema.safeParse(sampleReport).success, true);
});

test("改善策のない気になる点を拒否する", () => {
  const invalid = {
    ...validReport,
    concerns: [{ ...validReport.concerns[0], remedies: [] }],
  };

  assert.equal(reportSchema.safeParse(invalid).success, false);
});

test("未定義の方位と長すぎる文章を拒否する", () => {
  const invalidDirection = {
    ...structuredClone(validReport),
    placements: [{ direction: "上", rooms: ["洋室"] }],
  };
  const invalidLength = {
    ...structuredClone(validReport),
    talkTrack: "あ".repeat(701),
  };

  assert.equal(reportSchema.safeParse(invalidDirection).success, false);
  assert.equal(reportSchema.safeParse(invalidLength).success, false);
});
