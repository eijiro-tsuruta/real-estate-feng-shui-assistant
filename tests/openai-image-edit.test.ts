import assert from "node:assert/strict";
import test from "node:test";
import { requestOpenAIImageEdit } from "../lib/openai-image-edit";

test("OpenAIに編集対象と参考画像を渡す", async (t) => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let requestBody: Record<string, unknown> | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          output: [
            {
              type: "image_generation_call",
              result: Buffer.from([1, 2, 3]).toString("base64"),
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  try {
    const result = await requestOpenAIImageEdit({
      prompt: "玄関ドアだけを変更",
      images: [
        {
          bytes: Uint8Array.from([1]),
          mediaType: "image/jpeg",
          label: "編集対象",
        },
        {
          bytes: Uint8Array.from([2]),
          mediaType: "image/png",
          label: "参考画像",
        },
      ],
    });

    assert.deepEqual([...result.bytes], [1, 2, 3]);
    assert.equal(result.mediaType, "image/jpeg");
    const tools = requestBody?.tools as Array<Record<string, unknown>>;
    assert.equal(tools[0]?.action, "edit");
    assert.equal(tools[0]?.input_fidelity, "high");
    assert.equal(tools[0]?.output_format, "jpeg");
    const input = requestBody?.input as Array<{
      content: Array<{ type: string }>;
    }>;
    assert.equal(
      input[0]?.content.filter((item) => item.type === "input_image").length,
      2,
    );
  } finally {
    if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousApiKey;
  }
});
