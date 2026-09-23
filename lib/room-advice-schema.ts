import { z } from "zod";

export const roomAdviceSchema = z.object({
  summary: z.string().min(1).max(300),
  priorities: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        action: z.string().min(1).max(140),
        reason: z.string().min(1).max(160),
      }),
    )
    .min(1)
    .max(3),
  directions: z
    .array(
      z.object({
        direction: z.enum(["北", "東", "南", "西"]),
        observation: z.string().min(1).max(160),
        recommendations: z.array(z.string().min(1).max(120)).min(1).max(3),
      }),
    )
    .length(4),
  colorsAndMaterials: z.array(z.string().min(1).max(120)).max(4),
  lighting: z.array(z.string().min(1).max(120)).max(3),
  avoid: z.array(z.string().min(1).max(120)).max(3),
  talkTrack: z.string().min(1).max(300),
});

export type RoomAdvice = z.infer<typeof roomAdviceSchema>;
