import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  getLineEventMetadata,
  parseLineWebhookBody,
  sha256Text,
  verifyLineWebhookSignature,
} from "../lib/line/webhook";

const channelSecret = "test-channel-secret";
const rawBody = JSON.stringify({
  destination: "Ubot",
  events: [
    {
      type: "message",
      message: { type: "text", id: "message-1", text: "秘密の本文" },
      webhookEventId: "event-1",
      deliveryContext: { isRedelivery: false },
      timestamp: 1_795_000_000_000,
      source: { type: "user", userId: "user-1" },
      replyToken: "reply-token",
      mode: "active",
    },
  ],
});

function sign(body: string) {
  return createHmac("sha256", channelSecret).update(body).digest("base64");
}

test("LINE Webhookの生本文と署名を検証する", () => {
  assert.equal(
    verifyLineWebhookSignature({
      rawBody,
      channelSecret,
      signature: sign(rawBody),
    }),
    true,
  );
});

test("署名後に本文が変更されていれば拒否する", () => {
  assert.equal(
    verifyLineWebhookSignature({
      rawBody: `${rawBody} `,
      channelSecret,
      signature: sign(rawBody),
    }),
    false,
  );
});

test("イベント保存用メタデータにメッセージ本文を含めない", () => {
  const webhook = parseLineWebhookBody(rawBody);
  const metadata = getLineEventMetadata(webhook.events[0]);

  assert.deepEqual(metadata, {
    eventId: "event-1",
    lineUserId: "user-1",
    messageId: "message-1",
    eventType: "message",
  });
  assert.equal(JSON.stringify(metadata).includes("秘密の本文"), false);
});

test("LINEの接続確認用空イベントを受け付ける", () => {
  const webhook = parseLineWebhookBody(
    JSON.stringify({ destination: "Ubot", events: [] }),
  );
  assert.deepEqual(webhook.events, []);
});

test("Webhook本文のSHA-256を安定して生成する", () => {
  assert.match(sha256Text(rawBody), /^[a-f0-9]{64}$/);
  assert.equal(sha256Text(rawBody), sha256Text(rawBody));
});
