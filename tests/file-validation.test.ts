import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_IMAGE_BYTES,
  validateImage,
} from "../lib/file-validation";

const pngSignature = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

test("正しいPNG署名を受け付ける", async () => {
  const file = new File([pngSignature], "floor-plan.png", {
    type: "image/png",
  });
  const result = await validateImage(file);

  assert.equal(result.mediaType, "image/png");
  assert.deepEqual(result.bytes, pngSignature);
});

test("許可していないMIMEタイプを拒否する", async () => {
  const file = new File(["<svg/>"], "floor-plan.svg", {
    type: "image/svg+xml",
  });

  await assert.rejects(validateImage(file), /JPEG、PNG、WebP/);
});

test("MIMEタイプを偽装したファイルを署名検査で拒否する", async () => {
  const file = new File(["not an image"], "fake.png", {
    type: "image/png",
  });

  await assert.rejects(validateImage(file), /画像の形式を確認できません/);
});

test("空ファイルと4MB超過ファイルを拒否する", async () => {
  const empty = new File([], "empty.png", { type: "image/png" });
  const oversized = new File(
    [new Uint8Array(MAX_IMAGE_BYTES + 1)],
    "large.png",
    { type: "image/png" },
  );

  await assert.rejects(validateImage(empty), /4MB以下/);
  await assert.rejects(validateImage(oversized), /4MB以下/);
});
