import { test } from "node:test";
import assert from "node:assert/strict";
import { degreeMeters } from "./degree.js";

// The Figma variants used min 6 / max 10 and 25 of 33 completed.
const figma = { completed: 25, required: 33, min: 6, max: 10 };

test("variant 1: nothing selected -> red, need attention", () => {
  const m = degreeMeters({ ...figma });
  assert.equal(m.selected, 0);
  assert.equal(m.status.level, "low");
  assert.equal(m.status.title, "Need attention");
  assert.equal(m.remaining, 8);
  assert.equal(m.percent, 76);
});

test("variant 2: one class -> still low; percent is calculated (85, not the mockup's 90)", () => {
  const m = degreeMeters({ ...figma, pendingCredits: 3 });
  assert.equal(m.status.level, "low");
  assert.equal(m.projected, 28);
  assert.equal(m.percent, 85);
  assert.equal(m.remaining, 5);
});

test("variants 3 and 4: inside min..max -> good", () => {
  assert.equal(degreeMeters({ ...figma, pendingCredits: 6 }).status.title, "Looks good!");
  const m = degreeMeters({ ...figma, pendingCredits: 9 });
  assert.equal(m.status.level, "good");
  assert.equal(m.projected, 33);
  assert.equal(m.remaining, 0);
  assert.equal(m.percent, 100);
});

test("variant 5: over the max -> needs attention!, progress capped at required", () => {
  const m = degreeMeters({ ...figma, pendingCredits: 12 });
  assert.equal(m.status.level, "high");
  assert.equal(m.status.title, "Needs attention!");
  assert.equal(m.projected, 33);
  assert.equal(m.cartWidth + m.pendingWidth, 1);
});

test("cart credits and checked credits add up; bar splits into solid and striped parts", () => {
  const m = degreeMeters({ completed: 54, required: 120, min: 12, max: 18, cartCredits: 9, pendingCredits: 4 });
  assert.equal(m.selected, 13);
  assert.equal(m.status.level, "good");
  assert.equal(m.cartWidth, 9 / 18);
  assert.ok(Math.abs(m.pendingWidth - 4 / 18) < 1e-9);
  assert.equal(m.minMark, 12 / 18);
  assert.equal(m.percent, Math.round((67 / 120) * 100));
});
