import assert from "node:assert/strict";
import test from "node:test";
import { calculateKua } from "../lib/kua";

test("1984年生まれ男性は本命卦7", () => {
  const profile = calculateKua(1984, "male");
  assert.equal(profile.number, 7);
  assert.equal(profile.group, "西四命");
});

test("1984年生まれ女性は本命卦8", () => {
  assert.equal(calculateKua(1984, "female").number, 8);
});

test("本命卦5は男性2、女性8に読み替える", () => {
  assert.equal(calculateKua(1995, "male").number, 2);
  assert.equal(calculateKua(1999, "female").number, 8);
});

test("2000年以降の計算規則を適用する", () => {
  assert.equal(calculateKua(2001, "male").number, 8);
  assert.equal(calculateKua(2001, "female").number, 7);
});

test("範囲外の生年を拒否する", () => {
  assert.throws(() => calculateKua(1899, "male"));
});
