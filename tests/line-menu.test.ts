import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLineMenuMessage,
  buildLinePhotoChangeMessage,
  buildLinePhotoCompletionMessage,
} from "../lib/line/client";
import {
  buildLineIntakeObjectKey,
  buildMenuSelectionMessage,
  initialStepForMenu,
  isLineMenuOpenPostback,
  isLineMenuCommand,
  parsePhotoChangePostback,
  parseLineMenuPostback,
} from "../lib/line/menu";

test("固定IDのメニューポストバックを解釈する", () => {
  assert.equal(
    parseLineMenuPostback("menu=building_feng_shui"),
    "building_feng_shui",
  );
  assert.equal(parseLineMenuPostback("menu=room_feng_shui"), "room_feng_shui");
  assert.equal(parseLineMenuPostback("menu=wall_image"), "wall_image");
  assert.equal(parseLineMenuPostback("menu=unknown"), null);
});

test("写真完了後に変更とメニューのボタンを表示する", () => {
  const message = buildLinePhotoCompletionMessage("受付完了");
  assert.deepEqual(
    message.quickReply?.items.map((item) => item.action.data),
    ["photo_change=start", "menu=open"],
  );
  assert.equal(isLineMenuOpenPostback("menu=open"), true);
});

test("変更する方角をボタンで選択する", () => {
  const message = buildLinePhotoChangeMessage(["north", "east", "west"]);
  assert.deepEqual(
    message.quickReply?.items.map((item) => item.action.data),
    ["photo_change=north", "photo_change=east", "photo_change=west"],
  );
  assert.equal(parsePhotoChangePostback("photo_change=start"), "start");
  assert.equal(parsePhotoChangePostback("photo_change=south"), "south");
  assert.equal(parsePhotoChangePostback("photo_change=invalid"), null);
});

test("3つのメニューをクイックリプライボタンで表示する", () => {
  const message = buildLineMenuMessage();
  assert.equal(message.text, "ご希望のメニューを選んでください。");
  assert.deepEqual(
    message.quickReply?.items.map((item) => item.action.data),
    [
      "menu=building_feng_shui",
      "menu=room_feng_shui",
      "menu=wall_image",
    ],
  );
});

test("各メニューを専用の受付状態へ進める", () => {
  assert.equal(initialStepForMenu("building_feng_shui"), "awaiting_floorplan");
  assert.equal(initialStepForMenu("room_feng_shui"), "awaiting_room_photo");
  assert.equal(initialStepForMenu("wall_image"), "awaiting_wall_photo");
});

test("メニューへ戻る自由文を認識する", () => {
  assert.equal(isLineMenuCommand("メニュー"), true);
  assert.equal(isLineMenuCommand(" 最初に戻る "), true);
  assert.equal(isLineMenuCommand("写真を送る"), false);
});

test("選択後の案内を分岐する", () => {
  assert.match(buildMenuSelectionMessage("building_feng_shui"), /間取り図/);
  assert.match(buildMenuSelectionMessage("room_feng_shui"), /北・東・南・西/);
  assert.match(buildMenuSelectionMessage("wall_image"), /壁の写真/);
});

test("受付画像のObject StorageキーにLINEユーザーIDを含めない", () => {
  const key = buildLineIntakeObjectKey({
    lineUserId: "U-secret-user",
    kind: "wall",
    assetId: "asset-1",
    mediaType: "image/jpeg",
  });
  assert.equal(key.includes("U-secret-user"), false);
  assert.match(key, /^line-intake\/[a-f0-9]{24}\/wall\/asset-1\.jpg$/);
});
