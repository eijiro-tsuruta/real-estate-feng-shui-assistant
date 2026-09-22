import assert from "node:assert/strict";
import test from "node:test";
import {
  approveFloorPlan,
  attachOptionalFloorPlan,
  createProfessionalCase,
  markDelivered,
  receiveConfirmationAnswers,
  receiveDirectionPhoto,
  receiveFloorPlan,
} from "../lib/professional-case";

const now = "2026-09-22T00:00:00.000Z";

test("不動産案件は間取り図から始まり、金運を標準テーマにする", () => {
  const result = createProfessionalCase({
    id: "case_1",
    professionalId: "pro_1",
    customerLineUserId: "line_1",
    offering: "real_estate",
    now,
  });

  assert.equal(result.status, "awaiting_floorplan");
  assert.equal(result.floorPlanPolicy, "required");
  assert.deepEqual(result.themes, ["home_basics", "money"]);
});

test("恋愛は希望された案件だけ追加する", () => {
  const result = createProfessionalCase({
    id: "case_2",
    professionalId: "pro_1",
    customerLineUserId: "line_2",
    offering: "custom_home",
    includeLove: true,
    now,
  });

  assert.deepEqual(result.themes, ["home_basics", "money", "love"]);
});

test("間取り確認後に写真を一方向ずつ受け付ける", () => {
  let result = createProfessionalCase({
    id: "case_3",
    professionalId: "pro_1",
    customerLineUserId: "line_3",
    offering: "real_estate",
    now,
  });
  result = receiveFloorPlan(result, "asset_floorplan", now);
  assert.equal(result.status, "floorplan_review");
  result = approveFloorPlan(result, now);
  assert.equal(result.status, "awaiting_north_photo");

  result = receiveDirectionPhoto({
    current: result,
    direction: "north",
    assetId: "asset_north",
    questionIds: ["question_basket"],
    now,
  });
  assert.equal(result.status, "awaiting_answers");

  assert.throws(
    () => receiveConfirmationAnswers(result, [], now),
    /回答が不足/,
  );
  result = receiveConfirmationAnswers(result, ["question_basket"], now);
  assert.equal(result.status, "awaiting_east_photo");
});

test("リフォームは写真から開始し、任意で間取り図を追加できる", () => {
  let result = createProfessionalCase({
    id: "case_4",
    professionalId: "pro_1",
    customerLineUserId: "line_4",
    offering: "renovation",
    now,
  });
  assert.equal(result.status, "awaiting_north_photo");
  assert.equal(result.floorPlanPolicy, "optional");

  result = attachOptionalFloorPlan(result, "asset_floorplan", now);
  assert.equal(result.floorPlanAssetId, "asset_floorplan");
  assert.equal(result.status, "awaiting_north_photo");
});

test("4方向完了後はプロ確認を経なければ納品できない", () => {
  let result = createProfessionalCase({
    id: "case_5",
    professionalId: "pro_1",
    customerLineUserId: "line_5",
    offering: "professional_reading",
    now,
  });

  for (const direction of ["north", "east", "south", "west"] as const) {
    result = receiveDirectionPhoto({
      current: result,
      direction,
      assetId: `asset_${direction}`,
      now,
    });
  }
  assert.equal(result.status, "professional_review");
  result = markDelivered(result, now);
  assert.equal(result.status, "delivered");
});

test("順番の違う写真は受け付けない", () => {
  const result = createProfessionalCase({
    id: "case_6",
    professionalId: "pro_1",
    customerLineUserId: "line_6",
    offering: "renovation",
    now,
  });

  assert.throws(
    () =>
      receiveDirectionPhoto({
        current: result,
        direction: "east",
        assetId: "asset_east",
        now,
      }),
    /待っている状態ではありません/,
  );
});
