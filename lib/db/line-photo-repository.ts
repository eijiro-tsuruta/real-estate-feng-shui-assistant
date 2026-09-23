import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  createProfessionalCase,
  receiveDirectionPhoto,
  retractDirectionPhoto,
  retractLatestDirectionPhoto,
  type PhotoDirection,
  type ProfessionalCase,
} from "../professional-case";
import { directionFromCaseStatus } from "../line/photo-flow";
import type { RoomType } from "../line/menu";
import type { RoomAdvice } from "../room-advice-schema";
import { getDatabase } from "./client";
import {
  caseAssets,
  cases,
  customers,
  lineEvents,
  lineMenuSessions,
  professionals,
  reports,
} from "./schema";
import {
  getProfessionalCaseState,
  saveProfessionalCaseState,
} from "./professional-case-repository";

const LINE_PROFESSIONAL_ID = "line-official-account";
const ACTIVE_PHOTO_STATUSES = [
  "awaiting_north_photo",
  "awaiting_east_photo",
  "awaiting_south_photo",
  "awaiting_west_photo",
] as const;
const CORRECTABLE_PHOTO_STATUSES = [
  "awaiting_north_photo",
  "awaiting_east_photo",
  "awaiting_south_photo",
  "awaiting_west_photo",
  "awaiting_answers",
  "professional_review",
] as const;

const PHOTO_DIRECTIONS: PhotoDirection[] = ["north", "east", "south", "west"];

function stableCustomerId(lineUserId: string): string {
  return `line-${createHash("sha256").update(lineUserId).digest("hex").slice(0, 32)}`;
}

export async function getOrCreateLinePhotoCase(lineUserId: string): Promise<{
  customerId: string;
  direction: PhotoDirection;
  professionalCase: ProfessionalCase;
}> {
  const db = getDatabase();
  const proposedCustomerId = stableCustomerId(lineUserId);
  await db
    .insert(professionals)
    .values({
      id: LINE_PROFESSIONAL_ID,
      name: "LINE運用担当",
      brandName: "Rain AI｜おうち風水",
    })
    .onConflictDoNothing({ target: professionals.id });
  const [savedCustomer] = await db
    .insert(customers)
    .values({ id: proposedCustomerId, lineUserId })
    .onConflictDoUpdate({
      target: customers.lineUserId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: customers.id });
  if (!savedCustomer) throw new Error("LINE customer could not be saved.");
  const customerId = savedCustomer.id;

  const [active] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(
      and(
        eq(cases.customerId, customerId),
        inArray(cases.status, [...ACTIVE_PHOTO_STATUSES]),
      ),
    )
    .orderBy(desc(cases.createdAt))
    .limit(1);

  let state: ProfessionalCase;
  if (active) {
    const saved = await getProfessionalCaseState(active.id);
    if (!saved) throw new Error("Active LINE case could not be loaded.");
    state = saved.professionalCase;
  } else {
    state = createProfessionalCase({
      id: randomUUID(),
      professionalId: LINE_PROFESSIONAL_ID,
      customerLineUserId: lineUserId,
      offering: "renovation",
    });
    await saveProfessionalCaseState(state, customerId);
  }

  const direction = directionFromCaseStatus(state.status);
  if (!direction) throw new Error("LINE case is not waiting for a photo.");
  return { customerId, direction, professionalCase: state };
}

export async function saveLinePhotoAsset(args: {
  assetId: string;
  objectKey: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  customerId: string;
  direction: PhotoDirection;
  professionalCase: ProfessionalCase;
}): Promise<ProfessionalCase> {
  const db = getDatabase();
  const retainedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [existingAsset] = await db
    .select()
    .from(caseAssets)
    .where(
      and(
        eq(caseAssets.caseId, args.professionalCase.id),
        eq(caseAssets.kind, args.direction),
      ),
    )
    .limit(1);
  const effectiveAssetId = existingAsset?.id ?? args.assetId;

  if (existingAsset) {
    await db
      .update(caseAssets)
      .set({
        objectKey: args.objectKey,
        mediaType: args.mediaType,
        byteSize: args.byteSize,
        sha256: args.sha256,
        retainedUntil,
        deletedAt: null,
      })
      .where(eq(caseAssets.id, existingAsset.id));
  } else {
    await db.insert(caseAssets).values({
      id: effectiveAssetId,
      caseId: args.professionalCase.id,
      kind: args.direction,
      objectKey: args.objectKey,
      mediaType: args.mediaType,
      byteSize: args.byteSize,
      sha256: args.sha256,
      retainedUntil,
    });
  }

  try {
    const next = receiveDirectionPhoto({
      current: args.professionalCase,
      direction: args.direction,
      assetId: effectiveAssetId,
    });
    await saveProfessionalCaseState(next, args.customerId);
    return next;
  } catch (error) {
    if (existingAsset) {
      await db
        .update(caseAssets)
        .set({
          objectKey: existingAsset.objectKey,
          mediaType: existingAsset.mediaType,
          byteSize: existingAsset.byteSize,
          sha256: existingAsset.sha256,
          retainedUntil: existingAsset.retainedUntil,
          deletedAt: existingAsset.deletedAt,
        })
        .where(eq(caseAssets.id, existingAsset.id));
    } else {
      await db.delete(caseAssets).where(eq(caseAssets.id, effectiveAssetId));
    }
    throw error;
  }
}

export async function retractLatestLinePhoto(lineUserId: string): Promise<{
  caseId: string;
  direction: PhotoDirection;
  objectKey: string;
} | null> {
  const db = getDatabase();
  const [active] = await db
    .select({ caseId: cases.id, customerId: customers.id })
    .from(cases)
    .innerJoin(customers, eq(cases.customerId, customers.id))
    .where(
      and(
        eq(customers.lineUserId, lineUserId),
        inArray(cases.status, [...CORRECTABLE_PHOTO_STATUSES]),
      ),
    )
    .orderBy(desc(cases.updatedAt))
    .limit(1);
  if (!active) return null;

  const saved = await getProfessionalCaseState(active.caseId);
  if (!saved) throw new Error("Correctable LINE case could not be loaded.");
  const retracted = retractLatestDirectionPhoto(saved.professionalCase);
  if (!retracted) return null;

  const [asset] = await db
    .select({ id: caseAssets.id, objectKey: caseAssets.objectKey })
    .from(caseAssets)
    .where(
      and(
        eq(caseAssets.id, retracted.assetId),
        eq(caseAssets.caseId, active.caseId),
        isNull(caseAssets.deletedAt),
      ),
    )
    .limit(1);
  if (!asset) throw new Error("The photo selected for retake is unavailable.");

  const deletedAt = new Date();
  await db
    .update(caseAssets)
    .set({ deletedAt })
    .where(eq(caseAssets.id, asset.id));
  try {
    await saveProfessionalCaseState(
      retracted.professionalCase,
      active.customerId,
    );
  } catch (error) {
    await db
      .update(caseAssets)
      .set({ deletedAt: null })
      .where(eq(caseAssets.id, asset.id));
    throw error;
  }

  return {
    caseId: active.caseId,
    direction: retracted.direction,
    objectKey: asset.objectKey,
  };
}

export async function getLinePhotoChangeOptions(
  lineUserId: string,
): Promise<PhotoDirection[]> {
  const [active] = await getDatabase()
    .select({ caseId: cases.id })
    .from(cases)
    .innerJoin(customers, eq(cases.customerId, customers.id))
    .where(
      and(
        eq(customers.lineUserId, lineUserId),
        inArray(cases.status, [...CORRECTABLE_PHOTO_STATUSES]),
      ),
    )
    .orderBy(desc(cases.updatedAt))
    .limit(1);
  if (!active) return [];
  const saved = await getProfessionalCaseState(active.caseId);
  if (!saved) return [];
  return PHOTO_DIRECTIONS.filter(
    (direction) => Boolean(saved.professionalCase.photoAssetIds[direction]),
  );
}

export async function retractLinePhotoDirection(
  lineUserId: string,
  direction: PhotoDirection,
): Promise<{
  caseId: string;
  direction: PhotoDirection;
  objectKey: string;
} | null> {
  const db = getDatabase();
  const [active] = await db
    .select({ caseId: cases.id, customerId: customers.id })
    .from(cases)
    .innerJoin(customers, eq(cases.customerId, customers.id))
    .where(
      and(
        eq(customers.lineUserId, lineUserId),
        inArray(cases.status, [...CORRECTABLE_PHOTO_STATUSES]),
      ),
    )
    .orderBy(desc(cases.updatedAt))
    .limit(1);
  if (!active) return null;

  const saved = await getProfessionalCaseState(active.caseId);
  if (!saved) throw new Error("Correctable LINE case could not be loaded.");
  const retracted = retractDirectionPhoto(saved.professionalCase, direction);
  if (!retracted) return null;

  const [asset] = await db
    .select({ id: caseAssets.id, objectKey: caseAssets.objectKey })
    .from(caseAssets)
    .where(
      and(
        eq(caseAssets.id, retracted.assetId),
        eq(caseAssets.caseId, active.caseId),
        isNull(caseAssets.deletedAt),
      ),
    )
    .limit(1);
  if (!asset) throw new Error("The photo selected for retake is unavailable.");

  await db
    .update(caseAssets)
    .set({ deletedAt: new Date() })
    .where(eq(caseAssets.id, asset.id));
  try {
    await saveProfessionalCaseState(
      retracted.professionalCase,
      active.customerId,
    );
  } catch (error) {
    await db
      .update(caseAssets)
      .set({ deletedAt: null })
      .where(eq(caseAssets.id, asset.id));
    throw error;
  }

  return {
    caseId: active.caseId,
    direction,
    objectKey: asset.objectKey,
  };
}

export async function getLineRoomAdviceContext(lineUserId: string): Promise<{
  caseId: string;
  roomType: RoomType;
  images: Array<{
    direction: PhotoDirection;
    objectKey: string;
    mediaType: string;
  }>;
} | null> {
  const db = getDatabase();
  const [context] = await db
    .select({
      caseId: cases.id,
      roomType: lineMenuSessions.roomType,
    })
    .from(cases)
    .innerJoin(customers, eq(cases.customerId, customers.id))
    .innerJoin(
      lineMenuSessions,
      eq(lineMenuSessions.customerId, customers.id),
    )
    .where(
      and(
        eq(customers.lineUserId, lineUserId),
        eq(lineMenuSessions.selection, "room_feng_shui"),
        eq(lineMenuSessions.step, "complete"),
        eq(cases.status, "professional_review"),
      ),
    )
    .orderBy(desc(cases.updatedAt))
    .limit(1);
  if (!context?.roomType) return null;

  const assets = await db
    .select({
      direction: caseAssets.kind,
      objectKey: caseAssets.objectKey,
      mediaType: caseAssets.mediaType,
    })
    .from(caseAssets)
    .where(
      and(
        eq(caseAssets.caseId, context.caseId),
        inArray(caseAssets.kind, [...PHOTO_DIRECTIONS]),
        isNull(caseAssets.deletedAt),
      ),
    );
  if (assets.length !== 4) return null;

  return {
    caseId: context.caseId,
    roomType: context.roomType as RoomType,
    images: PHOTO_DIRECTIONS.map((direction) => {
      const asset = assets.find((candidate) => candidate.direction === direction);
      if (!asset) throw new Error(`Missing ${direction} room image.`);
      return { direction, objectKey: asset.objectKey, mediaType: asset.mediaType };
    }),
  };
}

export async function saveLineRoomAdvice(
  caseId: string,
  advice: RoomAdvice,
): Promise<void> {
  const db = getDatabase();
  const [latest] = await db
    .select({ version: reports.version })
    .from(reports)
    .where(eq(reports.caseId, caseId))
    .orderBy(desc(reports.version))
    .limit(1);
  await db.insert(reports).values({
    id: randomUUID(),
    caseId,
    version: (latest?.version ?? 0) + 1,
    content: advice,
  });
}

export async function updateLineEventStatus(args: {
  eventId: string;
  status: "processing" | "processed" | "ignored" | "error";
  caseId?: string;
  errorCode?: string;
}): Promise<void> {
  await getDatabase()
    .update(lineEvents)
    .set({
      status: args.status,
      caseId: args.caseId,
      errorCode: args.errorCode,
      processedAt: args.status === "processing" ? null : new Date(),
    })
    .where(eq(lineEvents.eventId, args.eventId));
}
