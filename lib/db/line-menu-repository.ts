import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type {
  LineIntakeAssetKind,
  LineMenuSelection,
  LineMenuStep,
  RoomType,
} from "../line/menu";
import { initialStepForMenu } from "../line/menu";
import { getDatabase } from "./client";
import { customers, lineIntakeAssets, lineMenuSessions } from "./schema";

function stableCustomerId(lineUserId: string): string {
  return `line-${createHash("sha256").update(lineUserId).digest("hex").slice(0, 32)}`;
}

async function ensureLineCustomer(lineUserId: string): Promise<string> {
  const db = getDatabase();
  const proposedCustomerId = stableCustomerId(lineUserId);
  const [customer] = await db
    .insert(customers)
    .values({ id: proposedCustomerId, lineUserId })
    .onConflictDoUpdate({
      target: customers.lineUserId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: customers.id });
  if (!customer) throw new Error("LINE customer could not be saved.");
  return customer.id;
}

export async function selectLineMenu(
  lineUserId: string,
  selection: LineMenuSelection,
): Promise<void> {
  const db = getDatabase();
  const customerId = await ensureLineCustomer(lineUserId);
  await db
    .insert(lineMenuSessions)
    .values({
      customerId,
      selection,
      step: initialStepForMenu(selection),
      roomType: null,
      wallStyle: null,
    })
    .onConflictDoUpdate({
      target: lineMenuSessions.customerId,
      set: {
        selection,
        step: initialStepForMenu(selection),
        roomType: null,
        wallStyle: null,
        updatedAt: new Date(),
      },
    });
}

export async function clearLineMenuSelection(lineUserId: string): Promise<void> {
  const [customer] = await getDatabase()
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.lineUserId, lineUserId))
    .limit(1);
  if (!customer) return;
  await getDatabase()
    .delete(lineMenuSessions)
    .where(eq(lineMenuSessions.customerId, customer.id));
}

export async function getLineMenuSession(lineUserId: string): Promise<{
  customerId: string;
  selection: LineMenuSelection;
  step: LineMenuStep;
  roomType: RoomType | null;
  wallStyle: string | null;
} | null> {
  const [session] = await getDatabase()
    .select({
      customerId: customers.id,
      selection: lineMenuSessions.selection,
      step: lineMenuSessions.step,
      roomType: lineMenuSessions.roomType,
      wallStyle: lineMenuSessions.wallStyle,
    })
    .from(customers)
    .innerJoin(
      lineMenuSessions,
      eq(lineMenuSessions.customerId, customers.id),
    )
    .where(eq(customers.lineUserId, lineUserId))
    .limit(1);
  if (!session) return null;
  return {
    ...session,
    selection: session.selection as LineMenuSelection,
    step: session.step as LineMenuStep,
    roomType: session.roomType as RoomType | null,
  };
}

export async function updateLineMenuStep(args: {
  lineUserId: string;
  step: LineMenuStep;
  roomType?: RoomType | null;
  wallStyle?: string | null;
}): Promise<void> {
  const session = await getLineMenuSession(args.lineUserId);
  if (!session) throw new Error("LINE menu session is unavailable.");
  await getDatabase()
    .update(lineMenuSessions)
    .set({
      step: args.step,
      ...(args.roomType !== undefined ? { roomType: args.roomType } : {}),
      ...(args.wallStyle !== undefined ? { wallStyle: args.wallStyle } : {}),
      updatedAt: new Date(),
    })
    .where(eq(lineMenuSessions.customerId, session.customerId));
}

export async function saveLineIntakeAsset(args: {
  id: string;
  lineUserId: string;
  kind: LineIntakeAssetKind;
  objectKey: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
}): Promise<{ previousObjectKey: string | null }> {
  const db = getDatabase();
  const customerId = await ensureLineCustomer(args.lineUserId);
  const [existing] = await db
    .select({ id: lineIntakeAssets.id, objectKey: lineIntakeAssets.objectKey })
    .from(lineIntakeAssets)
    .where(
      and(
        eq(lineIntakeAssets.customerId, customerId),
        eq(lineIntakeAssets.kind, args.kind),
      ),
    )
    .limit(1);
  const retainedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (existing) {
    await db
      .update(lineIntakeAssets)
      .set({
        objectKey: args.objectKey,
        mediaType: args.mediaType,
        byteSize: args.byteSize,
        sha256: args.sha256,
        retainedUntil,
        updatedAt: new Date(),
      })
      .where(eq(lineIntakeAssets.id, existing.id));
    return { previousObjectKey: existing.objectKey };
  }
  await db.insert(lineIntakeAssets).values({
    id: args.id,
    customerId,
    kind: args.kind,
    objectKey: args.objectKey,
    mediaType: args.mediaType,
    byteSize: args.byteSize,
    sha256: args.sha256,
    retainedUntil,
  });
  return { previousObjectKey: null };
}

export async function getLineIntakeAsset(
  lineUserId: string,
  kind: LineIntakeAssetKind,
): Promise<{
  objectKey: string;
  mediaType: string;
} | null> {
  const [asset] = await getDatabase()
    .select({
      objectKey: lineIntakeAssets.objectKey,
      mediaType: lineIntakeAssets.mediaType,
    })
    .from(customers)
    .innerJoin(
      lineIntakeAssets,
      eq(lineIntakeAssets.customerId, customers.id),
    )
    .where(
      and(
        eq(customers.lineUserId, lineUserId),
        eq(lineIntakeAssets.kind, kind),
      ),
    )
    .limit(1);
  return asset ?? null;
}
