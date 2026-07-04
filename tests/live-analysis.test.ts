import assert from "node:assert/strict";
import test from "node:test";
import { isLiveAnalysisEnabled } from "../lib/live-analysis";

test("開発環境では実解析を利用できる", () => {
  assert.equal(isLiveAnalysisEnabled("development", undefined), true);
});

test("本番環境は初期状態で実解析を停止する", () => {
  assert.equal(isLiveAnalysisEnabled("production", undefined), false);
  assert.equal(isLiveAnalysisEnabled("production", "false"), false);
});

test("本番環境は明示的に有効化した場合だけ実解析を許可する", () => {
  assert.equal(isLiveAnalysisEnabled("production", "true"), true);
});

test("本番APIは必要なフラグが片方でも欠けていれば停止する", () => {
  assert.equal(isLiveAnalysisEnabled("production", "true", "false"), false);
  assert.equal(isLiveAnalysisEnabled("production", "false", "true"), false);
  assert.equal(isLiveAnalysisEnabled("production", "true", "true"), true);
});
