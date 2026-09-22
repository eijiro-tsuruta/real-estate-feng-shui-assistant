import { NextResponse } from "next/server";
import { z } from "zod";
import { recordLineEvent } from "@/lib/db/line-event-repository";
import {
  getLineEventMetadata,
  MAX_LINE_WEBHOOK_BYTES,
  parseLineWebhookBody,
  sha256Text,
  verifyLineWebhookSignature,
} from "@/lib/line/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

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

    await Promise.all(
      webhook.events.map((event) =>
        recordLineEvent({
          ...getLineEventMetadata(event),
          payloadSha256,
        }),
      ),
    );

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
