import { createHash } from "node:crypto";
import { validateSignature } from "@line/bot-sdk";
import { z } from "zod";

export const MAX_LINE_WEBHOOK_BYTES = 1024 * 1024;

const lineSourceSchema = z
  .object({
    type: z.enum(["user", "group", "room"]),
    userId: z.string().min(1).max(100).optional(),
  })
  .passthrough();

const lineMessageSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.string().min(1).max(50),
  })
  .passthrough();

export const lineWebhookEventSchema = z
  .object({
    webhookEventId: z.string().min(1).max(100),
    type: z.string().min(1).max(50),
    timestamp: z.number().int().nonnegative(),
    replyToken: z.string().min(1).max(200).optional(),
    source: lineSourceSchema.optional(),
    message: lineMessageSchema.optional(),
    deliveryContext: z
      .object({ isRedelivery: z.boolean() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const lineWebhookBodySchema = z
  .object({
    destination: z.string().min(1).max(100),
    events: z.array(lineWebhookEventSchema).max(100),
  })
  .passthrough();

export type LineWebhookEvent = z.infer<typeof lineWebhookEventSchema>;

export function verifyLineWebhookSignature(args: {
  rawBody: string;
  channelSecret: string;
  signature: string;
}): boolean {
  return validateSignature(args.rawBody, args.channelSecret, args.signature);
}

export function parseLineWebhookBody(rawBody: string) {
  return lineWebhookBodySchema.parse(JSON.parse(rawBody));
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function getLineEventMetadata(event: LineWebhookEvent) {
  return {
    eventId: event.webhookEventId,
    lineUserId: event.source?.userId ?? null,
    messageId: event.message?.id ?? null,
    eventType: event.type,
  };
}
