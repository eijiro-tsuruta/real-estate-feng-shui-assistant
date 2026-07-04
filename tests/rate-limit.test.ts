import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "../lib/rate-limit";

test("設定回数を超えたリクエストを拒否する", () => {
  let now = 1_000;
  const limiter = createRateLimiter({
    maxRequests: 2,
    windowMs: 10_000,
    now: () => now,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-a").allowed, true);
  const rejected = limiter.check("client-a");
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfterSeconds, 10);

  now += 10_000;
  assert.equal(limiter.check("client-a").allowed, true);
});

test("識別子ごとに回数を分離する", () => {
  const limiter = createRateLimiter({ maxRequests: 1 });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-b").allowed, true);
  assert.equal(limiter.check("client-a").allowed, false);
});

test("エントリー数の上限を超えてメモリを増やさない", () => {
  const limiter = createRateLimiter({
    maxEntries: 2,
    windowMs: 10_000,
    now: () => 1_000,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-b").allowed, true);
  assert.equal(limiter.check("client-c").allowed, false);
  assert.equal(limiter.size(), 2);
});
