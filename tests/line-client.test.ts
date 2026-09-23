import assert from "node:assert/strict";
import test from "node:test";
import { pushLineText } from "../lib/line/client";

test("診断完了メッセージをLINEプッシュ送信する", async () => {
  const previousToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const previousFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody: Record<string, unknown> | undefined;
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-token-not-a-secret";
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(null, { status: 200 });
  };

  try {
    await pushLineText("U-test-user", "診断結果です。");
    assert.equal(requestUrl, "https://api.line.me/v2/bot/message/push");
    assert.equal(requestBody?.to, "U-test-user");
    assert.deepEqual(requestBody?.messages, [
      { type: "text", text: "診断結果です。" },
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    else process.env.LINE_CHANNEL_ACCESS_TOKEN = previousToken;
  }
});
