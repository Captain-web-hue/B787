"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AIRCRAFT_DATA,
  calculateJettison,
  formatDuration,
  type JettisonMode,
} from "@/lib/jettison";

const DEFAULT_INPUTS = {
  grossWeight: "211.1",
  totalFuel: "97.7",
  manualRemain: "52.2",
};

function parseTonnes(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return Number.NaN;
  return Number(normalized) * 1000;
}

function formatTonnes(value: number, fallback = "--.-") {
  if (!Number.isFinite(value)) return fallback;
  return (value / 1000).toFixed(1);
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
          if (parsed.grossWeight) setGrossWeight(parsed.grossWeight);
          if (parsed.totalFuel) setTotalFuel(parsed.totalFuel);
          if (parsed.manualRemain) setManualRemain(parsed.manualRemain);
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const result = useMemo(
    () =>
      calculateJettison({
        grossWeightKg: parseTonnes(input.grossWeight),
        totalFuelKg: parseTonnes(input.totalFuel),
        mode: input.mode,
        manualFuelToRemainKg: parseTonnes(input.manualRemain),
      }),
    [input.grossWeight, input.totalFuel, input.manualRemain, input.mode],
  );

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
                onChange={(event) => input.setGrossWeight(event.target.value)}
                aria-label="Current gross weight in tonnes"
              />
            </span>
            <span className="derived-line">
              ZFW&nbsp;&nbsp;{formatTonnes(result.zeroFuelWeightKg)}
            </span>
          </label>

          <div className="unit-stack" aria-hidden="true">
            <span>KGS</span>
            <span>X 1000</span>
          </div>

          <label className="input-card">
            <span className="system-label">TOTAL FUEL</span>
            <span className="display-field single">
              <input
                inputMode="decimal"
                autoComplete="off"
                value={input.totalFuel}
                onChange={(event) => input.setTotalFuel(event.target.value)}
                aria-label="Current total fuel in tonnes"
              />
            </span>
            <span className="derived-line">
              CTR&nbsp;&nbsp;{formatTonnes(result.assumedCenterFuelKg)}
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
              onClick={() => input.setMode("MAN")}
            >
              MAN
            </button>
          </div>

          <div className="remain-row">
            <span>TO REMAIN</span>
            <output className="magenta-display">
              {formatTonnes(result.selectedFuelToRemainKg)}
            </output>
            <span className="inline-unit">KGS X 1000</span>
          </div>

          <label className={`manual-row ${input.mode === "MAN" ? "enabled" : ""}`}>
            <span>MANUAL ENTRY</span>
            <span className="manual-field">
              <input
                inputMode="decimal"
                autoComplete="off"
                value={input.manualRemain}
                disabled={input.mode !== "MAN"}
                onChange={(event) => input.setManualRemain(event.target.value)}
                aria-label="Manual fuel to remain in tonnes"
              />
            </span>
            <span className="inline-unit">KGS X 1000</span>
          </label>
        </section>

        <div className="divider" />

        <section className="result-grid" aria-label="Jettison results">
          <article className="result-card primary">
            <span className="system-label">JETT TIME</span>
            <output>{formatDuration(result.estimatedTimeSeconds)}</output>
          </article>
          <article className="result-card">
            <span className="system-label">FUEL JETT</span>
            <output>{formatTonnes(result.actualFuelToJettisonKg)}</output>
            <small>KGS X 1000</small>
          </article>
          <article className="result-card">
            <span className="system-label">GW AFTER JETT</span>
            <output>{formatTonnes(result.grossWeightAfterJettisonKg)}</output>
            <small>KGS X 1000</small>
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
            <strong>1.36 T/MIN</strong>
          </div>
          <div>
            <span>CENTER EMPTY</span>
            <strong>0.57 T/MIN</strong>
          </div>
          <div>
            <span>MIN MAIN FUEL</span>
            <strong>7.8 T TOTAL</strong>
          </div>
        </section>
      </section>

      <p className="operational-note">
        Planning aid. Verify against current approved FCOM/QRH, company procedures,
        aircraft indications and actual conditions.
      </p>

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
              <div><dt>MTOW</dt><dd>{formatTonnes(AIRCRAFT_DATA.mtowKg)} t</dd></div>
              <div><dt>MLW</dt><dd>{formatTonnes(AIRCRAFT_DATA.mlwKg)} t</dd></div>
              <div><dt>MZFW</dt><dd>{formatTonnes(AIRCRAFT_DATA.mzfwKg)} t</dd></div>
              <div><dt>Main capacity</dt><dd>{formatTonnes(AIRCRAFT_DATA.mainTankCapacityKg)} t</dd></div>
              <div><dt>Center capacity</dt><dd>{formatTonnes(AIRCRAFT_DATA.centerTankCapacityKg)} t</dd></div>
              <div><dt>Minimum each main</dt><dd>{formatTonnes(AIRCRAFT_DATA.minFuelEachMainKg)} t</dd></div>
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
