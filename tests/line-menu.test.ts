import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLineMenuMessage,
  buildLineNorthConfirmationMessage,
  buildLineNorthDirectionMessage,
  buildLinePhotoChangeMessage,
  buildLinePhotoCompletionMessage,
  buildLineRoomTypeMessage,
  buildLineWallMethodMessage,
  buildLineWallTargetMessage,
} from "../lib/line/client";
import {
  buildLineIntakeObjectKey,
  buildMenuSelectionMessage,
  initialStepForMenu,
  isLineMenuOpenPostback,
  isLineMenuCommand,
  parseFloorPlanNorthPostback,
  parsePhotoChangePostback,
  parseLineMenuPostback,
  parseRoomTypePostback,
  roomTypeLabel,
} from "../lib/line/menu";
import {
  encodeWallImageState,
  parseWallImageState,
  parseWallMethodPostback,
  parseWallTargetPostback,
} from "../lib/line/wall-image-flow";

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
    ["room_advice=start", "photo_change=start", "menu=open"],
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

test("間取り図の北方向をボタンで確認する", () => {
  assert.deepEqual(
    buildLineNorthConfirmationMessage().quickReply?.items.map(
      (item) => item.action.data,
    ),
    [
      "floorplan_north=up",
      "floorplan_north=select",
      "floorplan_north=assume_up",
    ],
  );
  assert.equal(parseFloorPlanNorthPostback("floorplan_north=select"), "select");
  assert.equal(
    parseFloorPlanNorthPostback("floorplan_north=assume_up"),
    "assume_up",
  );
  assert.deepEqual(
    buildLineNorthDirectionMessage().quickReply?.items.map(
      (item) => item.action.data,
    ),
    [
      "floorplan_north=up",
      "floorplan_north=upRight",
      "floorplan_north=right",
      "floorplan_north=downRight",
      "floorplan_north=down",
      "floorplan_north=downLeft",
      "floorplan_north=left",
      "floorplan_north=upLeft",
    ],
  );
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
  assert.equal(initialStepForMenu("room_feng_shui"), "awaiting_room_type");
  assert.equal(initialStepForMenu("wall_image"), "awaiting_wall_photo");
});

test("お部屋の風水は部屋種別を固定IDで選択する", () => {
  assert.equal(parseRoomTypePostback("room_type=living_room"), "living_room");
  assert.equal(parseRoomTypePostback("room_type=bedroom"), "bedroom");
  assert.equal(parseRoomTypePostback("room_type=unknown"), null);
  assert.equal(roomTypeLabel("home_office"), "仕事部屋");
  assert.deepEqual(
    buildLineRoomTypeMessage().quickReply?.items.map((item) => item.action.data),
    [
      "room_type=living_room",
      "room_type=bedroom",
      "room_type=home_office",
      "room_type=child_room",
      "room_type=other",
    ],
  );
});

test("壁イメージは対象と指定方法をボタンで選ぶ", () => {
  assert.deepEqual(
    buildLineWallTargetMessage().quickReply?.items.map(
      (item) => item.action.data,
    ),
    [
      "wall_target=interior_wall",
      "wall_target=exterior_wall",
      "wall_target=front_door",
    ],
  );
  assert.deepEqual(
    buildLineWallMethodMessage().quickReply?.items.map(
      (item) => item.action.data,
    ),
    ["wall_method=words", "wall_method=reference", "wall_method=ai"],
  );
  assert.deepEqual(
    buildLineWallMethodMessage().quickReply?.items.map(
      (item) => item.action.label,
    ),
    [
      "言葉でイメージを伝える",
      "参考画像を送る",
      "AIに提案してもらう",
    ],
  );
  assert.equal(
    parseWallTargetPostback("wall_target=front_door"),
    "front_door",
  );
  assert.equal(parseWallMethodPostback("wall_method=reference"), "reference");
  assert.equal(parseWallMethodPostback("wall_method=unknown"), null);
});

test("壁イメージの選択状態を往復で保持する", () => {
  const state = {
    target: "exterior_wall" as const,
    method: "words" as const,
    description: "温かみのあるベージュ",
  };
  assert.deepEqual(parseWallImageState(encodeWallImageState(state)), state);
  assert.deepEqual(parseWallImageState("壊れたJSON"), {});
});

test("メニューへ戻る自由文を認識する", () => {
  assert.equal(isLineMenuCommand("メニュー"), true);
  assert.equal(isLineMenuCommand(" 最初に戻る "), true);
  assert.equal(isLineMenuCommand("写真を送る"), false);
});

test("選択後の案内を分岐する", () => {
  assert.match(buildMenuSelectionMessage("building_feng_shui"), /間取り図/);
  assert.match(buildMenuSelectionMessage("room_feng_shui"), /一つの部屋/);
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
