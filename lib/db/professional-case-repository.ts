import { eq } from "drizzle-orm";
import { getDatabase } from "./client";
import { caseAssets, cases, customers } from "./schema";
import type { PhotoDirection, ProfessionalCase } from "../professional-case";

export async function saveProfessionalCaseState(
  professionalCase: ProfessionalCase,
  customerId: string,
): Promise<void> {
  const db = getDatabase();
  const deliveredAt =
    professionalCase.status === "delivered"
      ? new Date(professionalCase.updatedAt)
      : null;

  await db
    .insert(cases)
    .values({
      id: professionalCase.id,
      professionalId: professionalCase.professionalId,
      customerId,
      offering: professionalCase.offering,
      floorPlanPolicy: professionalCase.floorPlanPolicy,
      themes: professionalCase.themes,
      status: professionalCase.status,
      pendingDirection: professionalCase.pendingDirection,
      pendingQuestionIds: professionalCase.pendingQuestionIds,
      createdAt: new Date(professionalCase.createdAt),
      updatedAt: new Date(professionalCase.updatedAt),
      deliveredAt,
    })
    .onConflictDoUpdate({
      target: cases.id,
      set: {
        offering: professionalCase.offering,
        floorPlanPolicy: professionalCase.floorPlanPolicy,
        themes: professionalCase.themes,
        status: professionalCase.status,
        pendingDirection: professionalCase.pendingDirection,
        pendingQuestionIds: professionalCase.pendingQuestionIds,
        updatedAt: new Date(professionalCase.updatedAt),
        deliveredAt,
      },
    });
}

export async function getProfessionalCaseState(
  caseId: string,
): Promise<{
  professionalCase: ProfessionalCase;
  customerId: string;
} | null> {
  const db = getDatabase();
  const [record] = await db
    .select({ caseRecord: cases, lineUserId: customers.lineUserId })
    .from(cases)
    .innerJoin(customers, eq(cases.customerId, customers.id))
    .where(eq(cases.id, caseId))
    .limit(1);
  if (!record) return null;

  const assets = await db
    .select({ id: caseAssets.id, kind: caseAssets.kind })
    .from(caseAssets)
    .where(eq(caseAssets.caseId, caseId));
  const floorPlanAssetId =
    assets.find((asset) => asset.kind === "floorplan")?.id ?? null;
  const photoAssetIds = Object.fromEntries(
    assets
      .filter((asset) =>
        ["north", "east", "south", "west"].includes(asset.kind),
      )
      .map((asset) => [asset.kind as PhotoDirection, asset.id]),
  ) as Partial<Record<PhotoDirection, string>>;

  const caseRecord = record.caseRecord;

  return {
    customerId: caseRecord.customerId,
    professionalCase: {
      id: caseRecord.id,
      professionalId: caseRecord.professionalId,
      customerLineUserId: record.lineUserId,
      offering: caseRecord.offering,
      floorPlanPolicy: caseRecord.floorPlanPolicy,
      themes: caseRecord.themes,
      status: caseRecord.status,
      floorPlanAssetId,
      photoAssetIds,
      pendingDirection: caseRecord.pendingDirection,
      pendingQuestionIds: caseRecord.pendingQuestionIds,
      createdAt: caseRecord.createdAt.toISOString(),
      updatedAt: caseRecord.updatedAt.toISOString(),
    },
  };
}
