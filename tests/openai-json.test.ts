import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { requestOpenAIJson } from "../lib/openai-json";

test("OpenAI Responses APIへ画像とJSON Schemaを送る", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  const previousFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;

  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
  process.env.OPENAI_MODEL = "test-vision-model";
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ output_text: '{"status":"ok"}' }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await requestOpenAIJson({
      prompt: "間取りを分析する",
      schema: z.object({ status: z.literal("ok") }),
      image: {
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mediaType: "image/png",
      },
    });

    assert.deepEqual(result, { status: "ok" });
    assert.equal(requestBody?.model, "test-vision-model");
    assert.equal(
      (requestBody?.text as { format?: { type?: string } })?.format?.type,
      "json_schema",
    );
    assert.match(JSON.stringify(requestBody), /data:image\/png;base64,/);
    assert.match(JSON.stringify(requestBody), /間取りを分析する/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
});

test("OpenAIのJSONをレポートスキーマで検証する", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ output_text: '{"score":9}' }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  try {
    await assert.rejects(() =>
      requestOpenAIJson({
        prompt: "test",
        schema: z.object({ score: z.number().max(5) }),
        image: {
          bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
          mediaType: "image/png",
        },
      }),
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("複数画像を方角ラベル付きで送る", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  let requestBody = "";
  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify({ output_text: '{"status":"ok"}' }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await requestOpenAIJson({
      prompt: "一つの部屋だけを分析する",
      schema: z.object({ status: z.literal("ok") }),
      images: [
        {
          bytes: new Uint8Array([1]),
          mediaType: "image/jpeg",
          label: "北側の写真",
        },
        {
          bytes: new Uint8Array([2]),
          mediaType: "image/jpeg",
          label: "東側の写真",
        },
      ],
    });
    assert.match(requestBody, /北側の写真/);
    assert.match(requestBody, /東側の写真/);
    assert.equal((requestBody.match(/input_image/g) ?? []).length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
