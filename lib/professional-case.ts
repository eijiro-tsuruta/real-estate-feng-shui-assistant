import { z } from "zod";

export const offeringSchema = z.enum([
  "real_estate",
  "custom_home",
  "renovation",
  "professional_reading",
]);

export const floorPlanPolicySchema = z.enum(["required", "optional"]);
export const diagnosisThemeSchema = z.enum(["home_basics", "money", "love"]);
export const photoDirectionSchema = z.enum(["north", "east", "south", "west"]);

export const caseStatusSchema = z.enum([
  "awaiting_floorplan",
  "floorplan_review",
  "awaiting_north_photo",
  "awaiting_east_photo",
  "awaiting_south_photo",
  "awaiting_west_photo",
  "awaiting_answers",
  "professional_review",
  "delivered",
]);

const directionOrder = photoDirectionSchema.options;

export const professionalCaseSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    professionalId: z.string().trim().min(1).max(100),
    customerLineUserId: z.string().trim().min(1).max(100),
    offering: offeringSchema,
    floorPlanPolicy: floorPlanPolicySchema,
    themes: z.array(diagnosisThemeSchema).min(1).max(3),
    status: caseStatusSchema,
    floorPlanAssetId: z.string().trim().min(1).max(200).nullable(),
    photoAssetIds: z.partialRecord(
      photoDirectionSchema,
      z.string().trim().min(1).max(200),
    ),
    pendingDirection: photoDirectionSchema.nullable(),
    pendingQuestionIds: z.array(z.string().trim().min(1).max(100)).max(10),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.themes).size !== value.themes.length) {
      context.addIssue({ code: "custom", message: "診断テーマが重複しています。" });
    }
    if (value.status === "awaiting_answers") {
      if (!value.pendingDirection || value.pendingQuestionIds.length === 0) {
        context.addIssue({
          code: "custom",
          message: "回答待ちには対象方位と質問が必要です。",
        });
      }
    } else if (value.pendingDirection || value.pendingQuestionIds.length > 0) {
      context.addIssue({
        code: "custom",
        message: "回答待ち以外に保留質問を残せません。",
      });
    }
  });

export type ProfessionalCase = z.infer<typeof professionalCaseSchema>;
export type Offering = z.infer<typeof offeringSchema>;
export type PhotoDirection = z.infer<typeof photoDirectionSchema>;

function defaultFloorPlanPolicy(offering: Offering): "required" | "optional" {
  return ["real_estate", "custom_home"].includes(offering)
    ? "required"
    : "optional";
}

function awaitingPhotoStatus(direction: PhotoDirection): ProfessionalCase["status"] {
  return `awaiting_${direction}_photo`;
}

function nextDirection(direction: PhotoDirection): PhotoDirection | "complete" {
  const index = directionOrder.indexOf(direction);
  return directionOrder[index + 1] ?? "complete";
}

function withUpdate(
  current: ProfessionalCase,
  update: Partial<ProfessionalCase>,
  now: string,
): ProfessionalCase {
  return professionalCaseSchema.parse({ ...current, ...update, updatedAt: now });
}

export function createProfessionalCase(args: {
  id: string;
  professionalId: string;
  customerLineUserId: string;
  offering: Offering;
  includeLove?: boolean;
  now?: string;
}): ProfessionalCase {
  const now = args.now ?? new Date().toISOString();
  const floorPlanPolicy = defaultFloorPlanPolicy(args.offering);
  return professionalCaseSchema.parse({
    id: args.id,
    professionalId: args.professionalId,
    customerLineUserId: args.customerLineUserId,
    offering: args.offering,
    floorPlanPolicy,
    themes: args.includeLove
      ? ["home_basics", "money", "love"]
      : ["home_basics", "money"],
    status:
      floorPlanPolicy === "required"
        ? "awaiting_floorplan"
        : "awaiting_north_photo",
    floorPlanAssetId: null,
    photoAssetIds: {},
    pendingDirection: null,
    pendingQuestionIds: [],
    createdAt: now,
    updatedAt: now,
  });
}

export function receiveFloorPlan(
  current: ProfessionalCase,
  assetId: string,
  now = new Date().toISOString(),
): ProfessionalCase {
  if (current.status !== "awaiting_floorplan") {
    throw new Error("現在の案件は間取り図を待っていません。");
  }
  return withUpdate(
    current,
    { floorPlanAssetId: assetId, status: "floorplan_review" },
    now,
  );
}

export function approveFloorPlan(
  current: ProfessionalCase,
  now = new Date().toISOString(),
): ProfessionalCase {
  if (current.status !== "floorplan_review" || !current.floorPlanAssetId) {
    throw new Error("確認できる間取り図がありません。");
  }
  return withUpdate(current, { status: "awaiting_north_photo" }, now);
}

export function attachOptionalFloorPlan(
  current: ProfessionalCase,
  assetId: string,
  now = new Date().toISOString(),
): ProfessionalCase {
  if (current.floorPlanPolicy !== "optional" || current.floorPlanAssetId) {
    throw new Error("任意の間取り図を追加できる状態ではありません。");
  }
  if (["professional_review", "delivered"].includes(current.status)) {
    throw new Error("確認工程が終わった案件には追加できません。");
  }
  return withUpdate(current, { floorPlanAssetId: assetId }, now);
}

export function receiveDirectionPhoto(args: {
  current: ProfessionalCase;
  direction: PhotoDirection;
  assetId: string;
  questionIds?: string[];
  now?: string;
}): ProfessionalCase {
  const expectedStatus = awaitingPhotoStatus(args.direction);
  if (args.current.status !== expectedStatus) {
    throw new Error(`${args.direction}方向の写真を待っている状態ではありません。`);
  }

  const now = args.now ?? new Date().toISOString();
  const questionIds = args.questionIds ?? [];
  const photoAssetIds = {
    ...args.current.photoAssetIds,
    [args.direction]: args.assetId,
  };

  if (questionIds.length > 0) {
    return withUpdate(
      args.current,
      {
        photoAssetIds,
        status: "awaiting_answers",
        pendingDirection: args.direction,
        pendingQuestionIds: questionIds,
      },
      now,
    );
  }

  const next = nextDirection(args.direction);
  return withUpdate(
    args.current,
    {
      photoAssetIds,
      status: next === "complete" ? "professional_review" : awaitingPhotoStatus(next),
    },
    now,
  );
}

export function receiveConfirmationAnswers(
  current: ProfessionalCase,
  answeredQuestionIds: string[],
  now = new Date().toISOString(),
): ProfessionalCase {
  if (current.status !== "awaiting_answers" || !current.pendingDirection) {
    throw new Error("現在の案件は確認回答を待っていません。");
  }
  const answered = new Set(answeredQuestionIds);
  if (current.pendingQuestionIds.some((id) => !answered.has(id))) {
    throw new Error("必要な確認質問への回答が不足しています。");
  }

  const next = nextDirection(current.pendingDirection);
  return withUpdate(
    current,
    {
      status: next === "complete" ? "professional_review" : awaitingPhotoStatus(next),
      pendingDirection: null,
      pendingQuestionIds: [],
    },
    now,
  );
}

export function markDelivered(
  current: ProfessionalCase,
  now = new Date().toISOString(),
): ProfessionalCase {
  if (current.status !== "professional_review") {
    throw new Error("プロ確認前の案件は納品できません。");
  }
  return withUpdate(current, { status: "delivered" }, now);
}
