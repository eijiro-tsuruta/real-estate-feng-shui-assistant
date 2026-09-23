import assert from "node:assert/strict";
import test from "node:test";
import { formatLineRoomAdvice } from "../lib/line/room-advice";
import { roomAdviceSchema } from "../lib/room-advice-schema";

const advice = roomAdviceSchema.parse({
  summary: "空室を前提に、動線を確保しながら落ち着ける配置を整えます。",
  priorities: [
    {
      title: "東側に植物を置く",
      action: "窓を遮らない低めの観葉植物を置きます。",
      reason: "自然光を活かしながら圧迫感を抑えられます。",
    },
  ],
  directions: [
    { direction: "北", observation: "壁面に余白があります。", recommendations: ["暖色の間接照明を置く"] },
    { direction: "東", observation: "窓があります。", recommendations: ["低い観葉植物を置く"] },
    { direction: "南", observation: "明るい壁面です。", recommendations: ["背の高い家具を避ける"] },
    { direction: "西", observation: "収納を置ける余白があります。", recommendations: ["扉付き収納を置く"] },
  ],
  colorsAndMaterials: ["木目と淡いベージュを基調にする"],
  lighting: ["北側に暖色の補助照明を置く"],
  avoid: ["窓や通路を大型家具で塞がない"],
  talkTrack: "空室の良さを活かし、無理なく整えられる配置からご提案します。",
});

test("一室専用のアドバイスをLINE向けに整形する", () => {
  const message = formatLineRoomAdvice("リビング", advice);
  assert.match(message, /リビングの風水アドバイス/);
  assert.match(message, /北側/);
  assert.match(message, /家具/);
  assert.equal(message.includes("浴室"), false);
  assert.ok(message.length < 5000);
});
