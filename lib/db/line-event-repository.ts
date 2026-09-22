import { lineEvents } from "./schema";
import { getDatabase } from "./client";

export async function recordLineEvent(args: {
  eventId: string;
  lineUserId: string | null;
  messageId: string | null;
  eventType: string;
  payloadSha256: string;
}): Promise<"recorded" | "duplicate"> {
  const db = getDatabase();
  const inserted = await db
    .insert(lineEvents)
    .values({
      eventId: args.eventId,
      lineUserId: args.lineUserId,
      messageId: args.messageId,
      eventType: args.eventType,
      payloadSha256: args.payloadSha256,
      status: "received",
    })
    .onConflictDoNothing({ target: lineEvents.eventId })
    .returning({ eventId: lineEvents.eventId });

  return inserted.length === 0 ? "duplicate" : "recorded";
}
