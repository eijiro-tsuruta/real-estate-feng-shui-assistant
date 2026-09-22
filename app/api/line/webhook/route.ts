import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { recordLineEvent } from "@/lib/db/line-event-repository";
import {
  getOrCreateLinePhotoCase,
  saveLinePhotoAsset,
  updateLineEventStatus,
} from "@/lib/db/line-photo-repository";
import { fetchLineImage, replyLineText } from "@/lib/line/client";
import {
  buildLinePhotoObjectKey,
  buildPhotoReceiptMessage,
} from "@/lib/line/photo-flow";
import {
  getLineEventMetadata,
  MAX_LINE_WEBHOOK_BYTES,
  parseLineWebhookBody,
  sha256Text,
  verifyLineWebhookSignature,
} from "@/lib/line/webhook";
import { deletePrivateObject, putPrivateObject } from "@/lib/object-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return jsonResponse({ error: "LINE webhook is not configured." }, 503);
  }

  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing LINE signature." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_LINE_WEBHOOK_BYTES
  ) {
    return jsonResponse({ error: "Webhook payload is too large." }, 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_LINE_WEBHOOK_BYTES) {
    return jsonResponse({ error: "Webhook payload is too large." }, 413);
  }

  if (
    !verifyLineWebhookSignature({
      rawBody,
      channelSecret,
      signature,
    })
  ) {
    return jsonResponse({ error: "Invalid LINE signature." }, 401);
  }

  try {
    const webhook = parseLineWebhookBody(rawBody);
    const payloadSha256 = sha256Text(rawBody);

    for (const event of webhook.events) {
      const recorded = await recordLineEvent({
        ...getLineEventMetadata(event),
        payloadSha256,
      });
      if (recorded === "duplicate") continue;

      if (
        event.type !== "message" ||
        event.message?.type !== "image" ||
        !event.message.id ||
        !event.source?.userId ||
        !event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "ignored",
        });
        continue;
      }

      await updateLineEventStatus({
        eventId: event.webhookEventId,
        status: "processing",
      });

      let objectKey: string | undefined;
      let photoSaved = false;
      try {
        const image = await fetchLineImage(event.message.id);
        const { customerId, direction, professionalCase } =
          await getOrCreateLinePhotoCase(event.source.userId);
        const assetId = randomUUID();
        objectKey = buildLinePhotoObjectKey({
          lineUserId: event.source.userId,
          caseId: professionalCase.id,
          direction,
          assetId,
          mediaType: image.mediaType,
        });
        await putPrivateObject({
          key: objectKey,
          bytes: image.bytes,
          contentType: image.mediaType,
        });
        await saveLinePhotoAsset({
          assetId,
          objectKey,
          mediaType: image.mediaType,
          byteSize: image.bytes.byteLength,
          sha256: createHash("sha256").update(image.bytes).digest("hex"),
          customerId,
          direction,
          professionalCase,
        });
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
          caseId: professionalCase.id,
        });
        photoSaved = true;
        try {
          await replyLineText(
            event.replyToken,
            buildPhotoReceiptMessage(direction),
          );
        } catch (error) {
          console.error("Failed to send LINE photo receipt", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
      } catch (error) {
        if (objectKey && !photoSaved) {
          try {
            await deletePrivateObject(objectKey);
          } catch {
            console.error("Failed to roll back LINE image object");
          }
        }
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "error",
          errorCode:
            error instanceof Error && /4MB/.test(error.message)
              ? "image_too_large"
              : "image_processing_failed",
        });
        console.error("Failed to process LINE image event", {
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonResponse({ error: "Invalid LINE webhook payload." }, 400);
    }

    console.error("Failed to persist LINE webhook event", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
}
