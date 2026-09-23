import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLinePhotoObjectKey,
  buildPhotoReceiptMessage,
  buildPhotoRetakeMessage,
  directionFromCaseStatus,
  isPhotoRetakeCommand,
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
  assert.match(buildPhotoReceiptMessage("north"), /「撮り直し」/);
  assert.match(buildPhotoReceiptMessage("west"), /4方向の写真が揃いました/);
});

test("明示的な撮り直し指示だけをコマンドとして扱う", () => {
  assert.equal(isPhotoRetakeCommand("撮り直し"), true);
  assert.equal(isPhotoRetakeCommand(" ひとつ戻る "), true);
  assert.equal(isPhotoRetakeCommand("写真を撮り直したいです"), false);
});

test("取り消した方角の再撮影を案内する", () => {
  assert.match(buildPhotoRetakeMessage("east"), /東側の写真を取り消しました/);
  assert.match(buildPhotoRetakeMessage("east"), /東側をもう一度/);
});
