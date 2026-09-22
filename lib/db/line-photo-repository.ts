import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  createProfessionalCase,
  receiveDirectionPhoto,
  type PhotoDirection,
  type ProfessionalCase,
} from "../professional-case";
import { directionFromCaseStatus } from "../line/photo-flow";
import { getDatabase } from "./client";
import {
  caseAssets,
  cases,
  customers,
  lineEvents,
  professionals,
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
  await db.insert(caseAssets).values({
    id: args.assetId,
    caseId: args.professionalCase.id,
    kind: args.direction,
    objectKey: args.objectKey,
    mediaType: args.mediaType,
    byteSize: args.byteSize,
    sha256: args.sha256,
    retainedUntil,
  });

  try {
    const next = receiveDirectionPhoto({
      current: args.professionalCase,
      direction: args.direction,
      assetId: args.assetId,
    });
    await saveProfessionalCaseState(next, args.customerId);
    return next;
  } catch (error) {
    await db.delete(caseAssets).where(eq(caseAssets.id, args.assetId));
    throw error;
  }
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
