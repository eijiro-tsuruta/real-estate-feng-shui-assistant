import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLinePhotoObjectKey,
  buildPhotoReceiptMessage,
  directionFromCaseStatus,
} from "../lib/line/photo-flow";

test("案件状態から受け付ける方位を決定する", () => {
  assert.equal(directionFromCaseStatus("awaiting_north_photo"), "north");
  assert.equal(directionFromCaseStatus("awaiting_west_photo"), "west");
  assert.equal(directionFromCaseStatus("professional_review"), null);
});

test("Object StorageキーにLINEユーザーIDを直接含めない", () => {
  const key = buildLinePhotoObjectKey({
    lineUserId: "U-secret-user",
    caseId: "case-1",
    direction: "north",
    assetId: "asset-1",
    mediaType: "image/jpeg",
  });
  assert.equal(key.includes("U-secret-user"), false);
  assert.match(key, /^line\/[a-f0-9]{24}\/case-1\/north\/asset-1\.jpg$/);
});

test("保存完了後に次の撮影方向を案内する", () => {
  assert.match(buildPhotoReceiptMessage("north"), /次は東側/);
  assert.match(buildPhotoReceiptMessage("west"), /4方向の写真が揃いました/);
});
