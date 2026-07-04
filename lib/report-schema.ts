import { z } from "zod";

export const directionSchema = z.enum([
  "北",
  "北東",
  "東",
  "南東",
  "南",
  "南西",
  "西",
  "北西",
  "中央",
  "不明",
]);

export const placementSchema = z.object({
  direction: directionSchema,
  rooms: z.array(z.string().min(1).max(50)).max(12),
});

export const pointSchema = z.object({
  title: z.string().min(1).max(80),
  explanation: z.string().min(1).max(500),
  directions: z.array(directionSchema).max(4),
});

export const concernSchema = pointSchema.extend({
  remedies: z.array(z.string().min(1).max(200)).min(1).max(5),
});

export const reportSchema = z.object({
  propertySummary: z.string().min(1).max(700),
  reading: z.object({
    north: z.string().min(1).max(200),
    confidence: z.enum(["高", "中", "低"]),
    summary: z.string().min(1).max(700),
  }),
  placements: z.array(placementSchema).min(1).max(9),
  positives: z.array(pointSchema).min(1).max(6),
  concerns: z.array(concernSchema).max(6),
  talkTrack: z.string().min(1).max(700),
});

export type FengShuiReport = z.infer<typeof reportSchema>;

export const REPORT_DISCLAIMER =
  "このレポートは、一般的な風水の考え方をもとに、物件説明を補助するための参考情報です。風水の効果、運勢、健康、金運、物件価値を保証するものではありません。流派や専門家によって見解が異なる場合があります。最終的な判断はお客様ご自身で行ってください。";
