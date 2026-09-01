import assert from "node:assert/strict";
import test from "node:test";
import { calculateJettison, formatDuration } from "../lib/jettison.ts";

test("calculates an MLW target with center fuel available", () => {
  const result = calculateJettison({ grossWeightKg: 211_100, totalFuelKg: 97_700, mode: "MLW" });
  assert.equal(result.zeroFuelWeightKg, 113_400);
  assert.equal(result.selectedFuelToRemainKg, 79_376);
  assert.equal(result.actualFuelToJettisonKg, 18_324);
  assert.equal(formatDuration(result.estimatedTimeSeconds), "13:28");
  assert.equal(result.status, "CALCULATION VALID");
});

test("uses the main-only rate after the assumed center quantity", () => {
  const result = calculateJettison({ grossWeightKg: 250_000, totalFuelKg: 70_000, mode: "MLW" });
  assert.equal(result.assumedCenterFuelKg, 36_448);
  assert.equal(result.actualFuelToJettisonKg, 57_224);
  assert.ok(Math.abs(result.estimatedTimeSeconds / 60 - 63.249122807) < 0.0001);
  assert.equal(formatDuration(result.estimatedTimeSeconds), "63:15");
});

test("protects 3,900 kg in each main tank", () => {
  const result = calculateJettison({ grossWeightKg: 200_000, totalFuelKg: 50_000, mode: "MAN", manualFuelToRemainKg: 3_900 });
  assert.equal(result.actualFuelToRemainKg, 7_800);
  assert.equal(result.actualFuelToJettisonKg, 42_200);
  assert.equal(result.status, "MINIMUM FUEL LIMIT");
  assert.equal(result.severity, "CAUTION");
});

test("uses 570 kg per minute when the center tank is empty", () => {
  const result = calculateJettison({ grossWeightKg: 190_000, totalFuelKg: 30_000, mode: "MAN", manualFuelToRemainKg: 20_000 });
  assert.equal(result.assumedCenterFuelKg, 0);
  assert.ok(Math.abs(result.estimatedTimeSeconds / 60 - 10_000 / 570) < 0.0001);
});

test("requires no jettison when already below MLW", () => {
  const result = calculateJettison({ grossWeightKg: 180_000, totalFuelKg: 40_000, mode: "MLW" });
  assert.equal(result.actualFuelToJettisonKg, 0);
  assert.equal(result.grossWeightAfterJettisonKg, 180_000);
  assert.equal(result.status, "CALCULATION VALID");
});

test("rejects fuel above total capacity", () => {
  const result = calculateJettison({ grossWeightKg: 250_000, totalFuelKg: 110_000, mode: "MLW" });
  assert.equal(result.valid, false);
  assert.equal(result.status, "CHECK INPUTS");
});
