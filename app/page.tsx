"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AIRCRAFT_DATA,
  calculateJettison,
  formatDuration,
  type JettisonMode,
} from "@/lib/jettison";
import { formatKg, normalizeWeightInput, parseWeightKg } from "@/lib/weight-input";

const DEFAULT_INPUTS = {
  grossWeight: "211100",
  totalFuel: "97700",
  manualRemain: "52200",
};

function isFiniteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function usePersistentState() {
  const [grossWeight, setGrossWeight] = useState(DEFAULT_INPUTS.grossWeight);
  const [totalFuel, setTotalFuel] = useState(DEFAULT_INPUTS.totalFuel);
  const [manualRemain, setManualRemain] = useState(DEFAULT_INPUTS.manualRemain);
  const [mode, setMode] = useState<JettisonMode>("MLW");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("b787-jettison-inputs-v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<{
            grossWeight: string;
            totalFuel: string;
            manualRemain: string;
            mode: JettisonMode;
          }>;
          if (parsed.grossWeight) setGrossWeight(normalizeWeightInput(parsed.grossWeight));
          if (parsed.totalFuel) setTotalFuel(normalizeWeightInput(parsed.totalFuel));
          if (parsed.manualRemain) setManualRemain(normalizeWeightInput(parsed.manualRemain));
          if (parsed.mode === "MLW" || parsed.mode === "MAN") setMode(parsed.mode);
        } catch {
          window.localStorage.removeItem("b787-jettison-inputs-v1");
        }
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      "b787-jettison-inputs-v1",
      JSON.stringify({ grossWeight, totalFuel, manualRemain, mode }),
    );
  }, [grossWeight, totalFuel, manualRemain, mode, ready]);

  return {
    grossWeight,
    setGrossWeight,
    totalFuel,
    setTotalFuel,
    manualRemain,
    setManualRemain,
    mode,
    setMode,
  };
}

export default function Home() {
  const input = usePersistentState();
  const manualRemainInput = useRef<HTMLInputElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }
  }, []);

  const result = useMemo(
    () =>
      calculateJettison({
        grossWeightKg: parseWeightKg(input.grossWeight),
        totalFuelKg: parseWeightKg(input.totalFuel),
        mode: input.mode,
        manualFuelToRemainKg: parseWeightKg(input.manualRemain),
      }),
    [input.grossWeight, input.totalFuel, input.manualRemain, input.mode],
  );

  const grossWeightKg = parseWeightKg(input.grossWeight);
  const totalFuelKg = parseWeightKg(input.totalFuel);
  const impliedZfwKg = grossWeightKg - totalFuelKg;
  const grossWeightEntered = isFiniteNonNegative(grossWeightKg);
  const totalFuelEntered = isFiniteNonNegative(totalFuelKg);
  const weightPairConsistent = !grossWeightEntered
    || !totalFuelEntered
    || (impliedZfwKg >= 0 && impliedZfwKg <= AIRCRAFT_DATA.mzfwKg);
  const grossWeightAccepted = grossWeightEntered
    && grossWeightKg <= AIRCRAFT_DATA.mtowKg
    && weightPairConsistent;
  const totalFuelAccepted = totalFuelEntered
    && totalFuelKg <= AIRCRAFT_DATA.totalFuelCapacityKg
    && weightPairConsistent;
  const manualRemainAccepted = isFiniteNonNegative(parseWeightKg(input.manualRemain));

  function selectManualMode() {
    input.setMode("MAN");
    window.setTimeout(() => manualRemainInput.current?.focus(), 0);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="icon-button menu-mark"
          type="button"
          aria-label="Installation help"
          onClick={() => setInstallOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="title-group">
          <p>B787 TOOLBOX</p>
          <h1>FUEL JETTISON</h1>
        </div>
        <button
          className="icon-button info-button"
          type="button"
          aria-label="Calculation details"
          onClick={() => setDetailsOpen(true)}
        >
          i
        </button>
      </header>

      <section className="calculator-panel" aria-label="Fuel jettison calculator">
        <div className="input-grid">
          <label className="input-card">
            <span className="system-label">GROSS WT</span>
            <span className="display-field">
              <input
                inputMode="decimal"
                autoComplete="off"
                value={input.grossWeight}
                onFocus={() => input.setGrossWeight("")}
                onChange={(event) => input.setGrossWeight(event.target.value)}
                onBlur={() => input.setGrossWeight(normalizeWeightInput(input.grossWeight))}
                aria-invalid={!grossWeightAccepted}
                aria-label="Current gross weight in tonnes"
              />
            </span>
            <span className="derived-line">
              ZFW&nbsp;&nbsp;{formatKg(result.zeroFuelWeightKg)}
            </span>
          </label>

          <div className="unit-stack" aria-hidden="true">
            <span>KG</span>
          </div>

          <label className="input-card">
            <span className="system-label">TOTAL FUEL</span>
            <span className="display-field single">
              <input
                inputMode="decimal"
                autoComplete="off"
                value={input.totalFuel}
                onFocus={() => input.setTotalFuel("")}
                onChange={(event) => input.setTotalFuel(event.target.value)}
                onBlur={() => input.setTotalFuel(normalizeWeightInput(input.totalFuel))}
                aria-invalid={!totalFuelAccepted}
                aria-label="Current total fuel in tonnes"
              />
            </span>
            <span className="derived-line">
              CTR&nbsp;&nbsp;{formatKg(result.assumedCenterFuelKg)}
            </span>
          </label>
        </div>

        <div className="divider" />

        <section className="remain-section">
          <span className="system-label">FUEL TO REMAIN</span>
          <div className="mode-selector" role="group" aria-label="Fuel to remain mode">
            <button
              type="button"
              className={input.mode === "MLW" ? "active" : ""}
              aria-pressed={input.mode === "MLW"}
              onClick={() => input.setMode("MLW")}
            >
              MLW
            </button>
            <button
              type="button"
              className={input.mode === "MAN" ? "active manual" : "manual"}
              aria-pressed={input.mode === "MAN"}
              onClick={selectManualMode}
            >
              MAN
            </button>
          </div>

          <div className="remain-row">
            <span>TO REMAIN</span>
            {input.mode === "MAN" ? (
              <span className="manual-field remain-editor">
                <input
                  ref={manualRemainInput}
                  inputMode="decimal"
                  autoComplete="off"
                  value={input.manualRemain}
                  onFocus={() => input.setManualRemain("")}
                  onChange={(event) => input.setManualRemain(event.target.value)}
                  onBlur={() => input.setManualRemain(normalizeWeightInput(input.manualRemain))}
                  aria-invalid={!manualRemainAccepted}
                  aria-label="Manual fuel to remain in tonnes"
                />
              </span>
            ) : (
              <output className="magenta-display">
                {formatKg(result.selectedFuelToRemainKg)}
              </output>
            )}
            <span className="inline-unit">KG</span>
          </div>
        </section>

        <div className="divider" />

        <section className="result-grid" aria-label="Jettison results">
          <article className="result-card primary">
            <span className="system-label">JETT TIME</span>
            <output>{formatDuration(result.estimatedTimeSeconds)}</output>
          </article>
          <article className="result-card">
            <span className="system-label">FUEL JETT</span>
            <output>{formatKg(result.actualFuelToJettisonKg)}</output>
            <small>KG</small>
          </article>
          <article className="result-card">
            <span className="system-label">GW AFTER JETT</span>
            <output>{formatKg(result.grossWeightAfterJettisonKg)}</output>
            <small>KG</small>
          </article>
        </section>

        <div className={`status-line ${result.severity.toLowerCase()}`}>
          <span className="status-dot" />
          <strong>{result.status}</strong>
          <span>{result.message}</span>
        </div>

        <section className="rate-strip" aria-label="Calculation assumptions">
          <div>
            <span>CTR FUEL AVAILABLE</span>
            <strong>1,360 KG/MIN</strong>
          </div>
          <div>
            <span>CENTER EMPTY</span>
            <strong>570 KG/MIN</strong>
          </div>
          <div>
            <span>MIN MAIN FUEL</span>
            <strong>7,800 KG TOTAL</strong>
          </div>
        </section>
      </section>

      <aside className="operational-note" aria-label="Operational disclaimer">
        <strong>QUICK CALCULATION AID</strong>
        <span>
          Intended only to help the flight crew quickly estimate jettison time while
          accomplishing the B787 <b>FUEL AUTO JETTISON</b> non-normal checklist when
          one or more tank quantity displays are blank. This tool does not replace the
          current approved QRH/NNC, aircraft indications, operator procedures or crew
          judgement. The approved checklist remains controlling.
        </span>
      </aside>

      {detailsOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetailsOpen(false)}>
          <section
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">CALCULATION DATA</span>
                <h2 id="details-title">Limits & assumptions</h2>
              </div>
              <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Close">×</button>
            </div>
            <dl className="data-list">
              <div><dt>MTOW</dt><dd>{formatKg(AIRCRAFT_DATA.mtowKg)} kg</dd></div>
              <div><dt>MLW</dt><dd>{formatKg(AIRCRAFT_DATA.mlwKg)} kg</dd></div>
              <div><dt>MZFW</dt><dd>{formatKg(AIRCRAFT_DATA.mzfwKg)} kg</dd></div>
              <div><dt>Main capacity</dt><dd>{formatKg(AIRCRAFT_DATA.mainTankCapacityKg)} kg</dd></div>
              <div><dt>Center capacity</dt><dd>{formatKg(AIRCRAFT_DATA.centerTankCapacityKg)} kg</dd></div>
              <div><dt>Minimum each main</dt><dd>{formatKg(AIRCRAFT_DATA.minFuelEachMainKg)} kg</dd></div>
            </dl>
            <p className="modal-copy">
              Tank distribution is estimated by filling the main tanks first, then the center tank.
              Jettison time uses the QRH rates of 1,360 kg/min while center fuel is available and
              570 kg/min once the center tank is empty. Times are estimates.
            </p>
            <h3>Input checks</h3>
            <ul className="check-list">
              {result.checks.map((check) => (
                <li key={check.label} className={check.ok ? "pass" : "fail"}>
                  <span>{check.ok ? "✓" : "!"}</span>
                  {check.label}
                </li>
              ))}
            </ul>
            <p className="source-note">Reference basis: B787 QRH Rev 9, 1 Sep 2025; B787 FCOM fuel-system data retained in the project source record.</p>
          </section>
        </div>
      )}

      {installOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setInstallOpen(false)}>
          <section
            className="modal-sheet compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">OFFLINE APP</span>
                <h2 id="install-title">Install on iPhone or iPad</h2>
              </div>
              <button type="button" onClick={() => setInstallOpen(false)} aria-label="Close">×</button>
            </div>
            <ol className="install-list">
              <li>Open this page in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Select <strong>Add to Home Screen</strong>.</li>
            </ol>
            <p className="modal-copy">After the first online load, the calculator remains available offline.</p>
          </section>
        </div>
      )}
    </main>
  );
}
