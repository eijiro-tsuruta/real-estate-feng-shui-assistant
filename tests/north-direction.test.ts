import assert from "node:assert/strict";
import test from "node:test";
import {
  getNorthInstruction,
  northOverrideSchema,
} from "../lib/north-direction";

test("自動認識では外周・四隅・矢印を確認させる", () => {
  const instruction = getNorthInstruction("auto");

  assert.match(instruction, /四隅/);
  assert.match(instruction, /余白/);
  assert.match(instruction, /矢印/);
  assert.match(instruction, /色付き矢印/);
  assert.match(instruction, /黒く塗られた三角形/);
  assert.match(instruction, /8方向/);
  assert.match(instruction, /推測で補わず/);
});

test("斜めの北方向を手動指定できる", () => {
  const instruction = getNorthInstruction("upLeft");

  assert.match(instruction, /図面の左上方向が北/);
  assert.equal(northOverrideSchema.safeParse("downRight").success, true);
});

test("手動指定を画像認識より優先する", () => {
  const instruction = getNorthInstruction("up");

  assert.match(instruction, /図面の上方向が北/);
  assert.match(instruction, /画像認識より優先/);
  assert.match(instruction, /confidenceは「高」/);
});

test("未定義の方位指定を拒否する", () => {
  assert.equal(northOverrideSchema.safeParse("diagonal").success, false);
});
