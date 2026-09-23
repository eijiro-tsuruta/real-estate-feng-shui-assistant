import assert from "node:assert/strict";
import test from "node:test";
import { formatLineBuildingAdvice } from "../lib/line/building-advice";
import { sampleReport } from "../lib/sample-report";

test("間取り診断をLINE向けに整形する", () => {
  const message = formatLineBuildingAdvice(sampleReport);

  assert.match(message, /建物間取り風水の診断/);
  assert.match(message, /方位の確認/);
  assert.match(message, /金運の見立て/);
  assert.match(message, /気になる点と改善策/);
  assert.ok(message.length <= 4900);
});
