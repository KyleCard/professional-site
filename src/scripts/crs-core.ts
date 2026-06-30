// ============================================================================
//  CRS Explorer — pure logic + SVG render helpers (no DOM, no side effects).
//  Shared by the Astro server render (static/no-JS fallback) and the client
//  island, so the two can never drift. All geometry lives here.
// ============================================================================
import type { CrsConfig } from "../data/crs";

type Axis = CrsConfig["axis"];

// ---- plot geometry (one SVG user-unit system) -----------------------------
export const PLOT = { w: 380, h: 360, axisX: 66, right: 366, top: 40, bottom: 312, colW: 150 };
export const TRACK = { w: 380, h: 88, x0: 30, x1: 350, y: 50 };
export const DOT_R = 9;

export const zeroY = (PLOT.top + PLOT.bottom) / 2;
const colCenter = (PLOT.axisX + PLOT.right) / 2;

export const valueToY = (v: number, a: Axis) =>
  PLOT.top + ((a.max - v) / (a.max - a.min)) * (PLOT.bottom - PLOT.top);
export const yToValue = (y: number, a: Axis) =>
  a.max - ((y - PLOT.top) / (PLOT.bottom - PLOT.top)) * (a.max - a.min);
export const replicateX = (i: number, n: number) =>
  n <= 1 ? colCenter : colCenter + (i / (n - 1) - 0.5) * PLOT.colW;
export const crsToTrackX = (crs: number) =>
  TRACK.x0 + ((crs + 1) / 2) * (TRACK.x1 - TRACK.x0);

export const clamp = (v: number, a: Axis) => Math.min(a.max, Math.max(a.min, v));
export const snap = (v: number, a: Axis) => Math.round(v / a.step) * a.step;

// ---- the CRS formula ------------------------------------------------------
//  normalizer = largest absolute response the axis allows (=1 for a ±1 axis),
//  so CRS = R̄ / max(|R|) is bounded on [−1,1]. (+1,+1,+1,−1 → 0.50.)
export function computeCRS(reps: number[], a: Axis): number {
  if (!reps.length) return 0;
  const mean = reps.reduce((s, v) => s + v, 0) / reps.length;
  const norm = Math.max(Math.abs(a.min), Math.abs(a.max)) || 1;
  return mean / norm;
}

export function fmtCRS(crs: number): string {
  if (Math.abs(crs) < 0.005) return "0.00";
  return (crs > 0 ? "+" : "−") + Math.abs(crs).toFixed(2);
}

const dirWord = (v: number, eps: number) =>
  v > eps ? "collateral resistance" : v < -eps ? "collateral sensitivity" : "no change";

export function valueText(v: number, a: Axis): string {
  return `${fmtCRS(v)}, ${dirWord(v, a.step / 2)}`;
}

// ---- plain-language readout (announced via aria-live) ---------------------
export function readout(reps: number[], a: Axis): { crs: number; text: string } {
  const crs = computeCRS(reps, a);
  const eps = a.step / 2;
  const total = reps.length;
  const res = reps.filter((v) => v > eps).length;
  const sen = reps.filter((v) => v < -eps).length;
  const mag = Math.abs(crs);

  let phrase: string;
  if (mag <= 0.2) phrase = "replicates diverge — outcome highly uncertain (CRS ≈ 0)";
  else if (mag >= 0.5) phrase = `leaning predictable ${dirWord(crs, eps)}`;
  else phrase = `a ${dirWord(crs, eps)} trend, but replicates disagree`;

  let count: string;
  if (res > 0 && sen > 0) {
    const maj = res >= sen ? "resistance" : "sensitivity";
    count = `${Math.max(res, sen)} of ${total} replicates evolved cross-${maj}`;
  } else if (res === total) count = `all ${total} replicates evolved cross-resistance`;
  else if (sen === total) count = `all ${total} replicates evolved collateral sensitivity`;
  else count = `${total} replicates near baseline`;

  return { crs, text: `${count}; net CRS = ${fmtCRS(crs)} — ${phrase}.` };
}

// ---- SVG render (returns markup strings; same output server & client) ------
const esc = (s: string) => s.replace(/"/g, "&quot;");

export function renderPlot(reps: number[], a: Axis, drug: string, sel = -1): string {
  const zones =
    `<rect x="${PLOT.axisX}" y="${PLOT.top}" width="${PLOT.right - PLOT.axisX}" height="${zeroY - PLOT.top}" class="crs-zone-res"/>` +
    `<rect x="${PLOT.axisX}" y="${zeroY}" width="${PLOT.right - PLOT.axisX}" height="${PLOT.bottom - zeroY}" class="crs-zone-sen"/>`;
  const axis =
    `<line x1="${PLOT.axisX}" y1="${PLOT.top}" x2="${PLOT.axisX}" y2="${PLOT.bottom}" class="crs-axis"/>` +
    `<line x1="${PLOT.axisX}" y1="${zeroY}" x2="${PLOT.right}" y2="${zeroY}" class="crs-zero"/>` +
    `<text x="${PLOT.axisX - 10}" y="${PLOT.top + 4}" class="crs-axlab" text-anchor="end">+1</text>` +
    `<text x="${PLOT.axisX - 10}" y="${zeroY + 4}" class="crs-axlab" text-anchor="end">0</text>` +
    `<text x="${PLOT.axisX - 10}" y="${PLOT.bottom + 4}" class="crs-axlab" text-anchor="end">−1</text>` +
    `<text x="${PLOT.right}" y="${PLOT.top - 14}" class="crs-zonelab res" text-anchor="end">collateral resistance ↑</text>` +
    `<text x="${PLOT.right}" y="${PLOT.bottom + 22}" class="crs-zonelab sen" text-anchor="end">↓ collateral sensitivity</text>` +
    `<text transform="translate(20 ${zeroY}) rotate(-90)" class="crs-axtitle" text-anchor="middle">log₂ relative MIC</text>`;
  const dots = reps
    .map((v, i) => {
      const cx = replicateX(i, reps.length).toFixed(1);
      const cy = valueToY(v, a).toFixed(1);
      const sign = v > a.step / 2 ? "pos" : v < -a.step / 2 ? "neg" : "zero";
      return (
        `<circle class="crs-dot ${sign}${i === sel ? " sel" : ""}" data-i="${i}" cx="${cx}" cy="${cy}" r="${DOT_R}" ` +
        `tabindex="0" role="slider" aria-label="${esc(drug)}, replicate ${i + 1} of ${reps.length}" ` +
        `aria-valuemin="${a.min}" aria-valuemax="${a.max}" aria-valuenow="${v.toFixed(2)}" aria-valuetext="${esc(valueText(v, a))}"/>`
      );
    })
    .join("");
  return zones + axis + `<g class="crs-dots">${dots}</g>`;
}

export function renderTrack(crs: number): string {
  const x = crsToTrackX(crs).toFixed(1);
  const tick = (c: number, label: string) => {
    const tx = crsToTrackX(c).toFixed(1);
    return `<line x1="${tx}" y1="${TRACK.y - 7}" x2="${tx}" y2="${TRACK.y + 7}" class="crs-ttick"/>` +
      `<text x="${tx}" y="${TRACK.y + 26}" class="crs-tlab" text-anchor="middle">${label}</text>`;
  };
  return (
    `<defs><linearGradient id="crs-grad" x1="0" x2="1" y1="0" y2="0">` +
      `<stop offset="0" stop-color="var(--slate)"/><stop offset="0.5" stop-color="var(--rule)"/>` +
      `<stop offset="1" stop-color="var(--amber)"/></linearGradient></defs>` +
    `<rect x="${TRACK.x0}" y="${TRACK.y - 4}" width="${TRACK.x1 - TRACK.x0}" height="8" rx="4" class="crs-track-bar" fill="url(#crs-grad)"/>` +
    tick(-1, "−1 sensitivity") + tick(0, "0 uncertain") + tick(1, "+1 resistance") +
    `<g class="crs-marker" transform="translate(${x} 0)">` +
      `<path d="M0 ${TRACK.y - 16} l7 -11 l-14 0 z" class="crs-marker-tri"/>` +
      `<text x="0" y="${TRACK.y - 31}" class="crs-marker-val" text-anchor="middle">${fmtCRS(crs)}</text>` +
    `</g>`
  );
}
