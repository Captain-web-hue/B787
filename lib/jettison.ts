export type JettisonMode = "MLW" | "MAN";

export const AIRCRAFT_DATA = Object.freeze({
  mtowKg: 252_650,
  mlwKg: 192_776,
  mzfwKg: 181_436,
  mainTankCapacityKg: 33_552,
  centerTankCapacityKg: 67_899,
  totalFuelCapacityKg: 101_451,
  allTanksJettisonRateKgMin: 1_360,
  mainOnlyJettisonRateKgMin: 570,
  minFuelEachMainKg: 3_900,
  minTotalMainFuelKg: 7_800,
});

export interface JettisonInputs {
  grossWeightKg: number;
  totalFuelKg: number;
  mode: JettisonMode;
  manualFuelToRemainKg?: number;
}

export interface CheckResult {
  label: string;
  ok: boolean;
}

export interface JettisonResult {
  valid: boolean;
  severity: "OK" | "CAUTION" | "INVALID";
  status: string;
  message: string;
  zeroFuelWeightKg: number;
  assumedCenterFuelKg: number;
  assumedMainFuelKg: number;
  selectedFuelToRemainKg: number;
  actualFuelToRemainKg: number;
  requestedFuelToJettisonKg: number;
  actualFuelToJettisonKg: number;
  grossWeightAfterJettisonKg: number;
  estimatedTimeSeconds: number;
  checks: CheckResult[];
}

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function calculateJettison(inputs: JettisonInputs): JettisonResult {
  const gross = inputs.grossWeightKg;
  const fuel = inputs.totalFuelKg;
  const zfw = gross - fuel;
  const manual = inputs.manualFuelToRemainKg ?? Number.NaN;
  const basicInputsValid = finiteNonNegative(gross) && finiteNonNegative(fuel);
  const manualValid = inputs.mode === "MLW" || finiteNonNegative(manual);

  const assumedCenterFuel = basicInputsValid
    ? Math.max(0, fuel - AIRCRAFT_DATA.mainTankCapacityKg)
    : Number.NaN;
  const assumedMainFuel = basicInputsValid
    ? Math.min(fuel, AIRCRAFT_DATA.mainTankCapacityKg)
    : Number.NaN;

  const mlwFuelToRemain = AIRCRAFT_DATA.mlwKg - zfw;
  const rawSelectedRemain = inputs.mode === "MLW"
    ? Math.min(fuel, mlwFuelToRemain)
    : manual;
  const selectedRemain = Number.isFinite(rawSelectedRemain)
    ? Math.min(fuel, Math.max(0, rawSelectedRemain))
    : Number.NaN;

  const maxJettisonable = basicInputsValid
    ? Math.max(0, fuel - AIRCRAFT_DATA.minTotalMainFuelKg)
    : Number.NaN;
  const requestedJettison = Number.isFinite(rawSelectedRemain)
    ? Math.max(0, fuel - rawSelectedRemain)
    : Number.NaN;
  const actualJettison = basicInputsValid && Number.isFinite(requestedJettison)
    ? Math.min(requestedJettison, maxJettisonable)
    : Number.NaN;
  const actualRemain = basicInputsValid && Number.isFinite(actualJettison)
    ? fuel - actualJettison
    : Number.NaN;
  const grossAfter = basicInputsValid && Number.isFinite(actualJettison)
    ? gross - actualJettison
    : Number.NaN;

  const fastPhaseFuel = Number.isFinite(actualJettison)
    ? Math.min(actualJettison, assumedCenterFuel)
    : Number.NaN;
  const mainOnlyPhaseFuel = Number.isFinite(actualJettison)
    ? Math.max(0, actualJettison - fastPhaseFuel)
    : Number.NaN;
  const timeMinutes = Number.isFinite(actualJettison)
    ? fastPhaseFuel / AIRCRAFT_DATA.allTanksJettisonRateKgMin
      + mainOnlyPhaseFuel / AIRCRAFT_DATA.mainOnlyJettisonRateKgMin
    : Number.NaN;

  const checks: CheckResult[] = [
    { label: "Numeric inputs entered", ok: basicInputsValid && manualValid },
    { label: "Fuel within total capacity", ok: basicInputsValid && fuel <= AIRCRAFT_DATA.totalFuelCapacityKg },
    { label: "Current gross weight at or below MTOW", ok: basicInputsValid && gross <= AIRCRAFT_DATA.mtowKg },
    { label: "Implied ZFW is valid and at or below MZFW", ok: basicInputsValid && zfw >= 0 && zfw <= AIRCRAFT_DATA.mzfwKg },
    { label: "Selected fuel does not exceed current fuel", ok: Number.isFinite(rawSelectedRemain) && rawSelectedRemain <= fuel },
    { label: "Selected fuel protects 3,900 kg in each main tank", ok: Number.isFinite(rawSelectedRemain) && (fuel < AIRCRAFT_DATA.minTotalMainFuelKg || rawSelectedRemain >= AIRCRAFT_DATA.minTotalMainFuelKg) },
  ];

  const invalid = checks.slice(0, 4).some((check) => !check.ok);
  const minFuelLimited = Number.isFinite(rawSelectedRemain)
    && fuel >= AIRCRAFT_DATA.minTotalMainFuelKg
    && rawSelectedRemain < AIRCRAFT_DATA.minTotalMainFuelKg;
  const targetAboveCurrentFuel = Number.isFinite(rawSelectedRemain) && rawSelectedRemain > fuel;
  const aboveMlw = Number.isFinite(grossAfter) && grossAfter > AIRCRAFT_DATA.mlwKg + 0.5;

  let severity: JettisonResult["severity"] = "OK";
  let status = "CALCULATION VALID";
  let message = actualJettison > 0 ? "Estimated jettison available" : "No fuel jettison required";

  if (invalid || !manualValid) {
    severity = "INVALID";
    status = "CHECK INPUTS";
    message = "One or more structural input checks failed";
  } else if (minFuelLimited) {
    severity = "CAUTION";
    status = "MINIMUM FUEL LIMIT";
    message = "Calculation stops at 7.8 t total main fuel";
  } else if (targetAboveCurrentFuel) {
    severity = "CAUTION";
    status = "TARGET ABOVE FOB";
    message = "Selected fuel to remain exceeds current fuel";
  } else if (aboveMlw) {
    severity = "CAUTION";
    status = "ABOVE MLW";
    message = "Selected target remains above maximum landing weight";
  }

  return {
    valid: !invalid && manualValid,
    severity,
    status,
    message,
    zeroFuelWeightKg: zfw,
    assumedCenterFuelKg: assumedCenterFuel,
    assumedMainFuelKg: assumedMainFuel,
    selectedFuelToRemainKg: selectedRemain,
    actualFuelToRemainKg: actualRemain,
    requestedFuelToJettisonKg: requestedJettison,
    actualFuelToJettisonKg: actualJettison,
    grossWeightAfterJettisonKg: grossAfter,
    estimatedTimeSeconds: timeMinutes * 60,
    checks,
  };
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
