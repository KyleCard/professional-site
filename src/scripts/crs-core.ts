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

// ---- replicate tally + plain-language interpretation ----------------------
//  Counts each replicate as cross-resistant (R>0), collaterally sensitive
//  (R<0), or unchanged (R≈0), so the readout can never confuse "all at
//  baseline (no change)" with "replicates diverge (genuine uncertainty)".
export interface Readout {
  crs: number; res: number; sen: number; base: number; total: number;
  interp: string; live: string;
}

export function readout(reps: number[], a: Axis): Readout {
  const crs = computeCRS(reps, a);
  const eps = a.step / 2;
  const total = reps.length;
  const res = reps.filter((v) => v > eps).length;
  const sen = reps.filter((v) => v < -eps).length;
  const base = total - res - sen;
  const mag = Math.abs(crs);
  const dir = crs > 0 ? "resistance" : "sensitivity";

  let interp: string;
  if (base === total) interp = "No collateral change — every replicate stayed at baseline.";
  else if (mag >= 0.5) interp = `Leaning predictable collateral ${dir}.`;
  else if (res > 0 && sen > 0)
    interp = mag <= 0.2
      ? "Replicates diverge — outcome highly uncertain."
      : `A collateral ${dir} trend, but replicates disagree.`;
  else
    interp = mag <= 0.2
      ? `A faint collateral ${dir} signal — most replicates unchanged.`
      : `A weak collateral ${dir} signal.`;

  const live = `${res} of ${total} cross-resistant, ${sen} collaterally sensitive, ${base} unchanged. CRS ${fmtCRS(crs)}. ${interp}`;
  return { crs, res, sen, base, total, interp, live };
}

export function tallyRows(res: number, sen: number, base: number): string {
  const row = (cls: string, label: string, n: number) =>
    `<tr><th scope="row"><i class="crs-sw ${cls}" aria-hidden="true"></i>${label}</th><td class="crs-n">${n}</td></tr>`;
  return row("res", "Cross-resistance", res) + row("sen", "Collateral sensitivity", sen) + row("base", "No change", base);
}

// ---- Layer 2: per-drug CRS profile (mini bars) ----------------------------
export const MINIBAR = { w: 220, h: 26, x0: 8, x1: 212, y: 13 };
export const crsMiniX = (crs: number) => MINIBAR.x0 + ((crs + 1) / 2) * (MINIBAR.x1 - MINIBAR.x0);
const signClass = (c: number) => (c > 0.05 ? "pos" : c < -0.05 ? "neg" : "zero");

export function renderProfileRows(drugs: string[], crsVals: number[]): string {
  const zero = crsMiniX(0).toFixed(1);
  return drugs
    .map((d, i) => {
      const c = crsVals[i] ?? 0;
      const x = crsMiniX(c).toFixed(1);
      return (
        `<div class="crs-prow" data-i="${i}">` +
        `<span class="crs-pdrug mono">${esc(d)}</span>` +
        `<svg class="crs-pbar" viewBox="0 0 ${MINIBAR.w} ${MINIBAR.h}" aria-hidden="true">` +
          `<rect x="${MINIBAR.x0}" y="${MINIBAR.y - 3}" width="${MINIBAR.x1 - MINIBAR.x0}" height="6" rx="3" class="crs-pbar-bg"/>` +
          `<line x1="${zero}" y1="${MINIBAR.y - 8}" x2="${zero}" y2="${MINIBAR.y + 8}" class="crs-pzero"/>` +
          `<g class="crs-mk-g" transform="translate(${x} 0)"><circle class="crs-mk ${signClass(c)}" cx="0" cy="${MINIBAR.y}" r="6"/></g>` +
        `</svg>` +
        `<span class="crs-pval mono">${fmtCRS(c)}</span>` +
        `</div>`
      );
    })
    .join("");
}

// one accessible line per drug (used in the no-JS fallback / SR summary)
export function profileSummary(drugs: string[], crsVals: number[]): string {
  return drugs.map((d, i) => `${esc(d)} CRS ${fmtCRS(crsVals[i] ?? 0)}`).join("; ") + ".";
}

// ---- Layer 3: CRS as a distribution ---------------------------------------
export interface MixComp { weight: number; mean: number; sd: number; }
const gauss = (x: number, m: number, sd: number) => Math.exp(-((x - m) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
export const mixturePdf = (comps: MixComp[], x: number) => comps.reduce((s, c) => s + c.weight * gauss(x, c.mean, c.sd), 0);
export const mixtureMean = (comps: MixComp[]) => {
  const w = comps.reduce((s, c) => s + c.weight, 0) || 1;
  return comps.reduce((s, c) => s + c.weight * c.mean, 0) / w;
};

// generate a plausible bootstrap distribution centred on a drug's CRS:
// large |CRS| → narrow & confident; small |CRS| → bimodal, straddling zero.
export function genComponents(c: number): MixComp[] {
  if (Math.abs(c) >= 0.45) return [{ weight: 1, mean: c, sd: 0.09 }];
  const wp = Math.min(0.95, Math.max(0.05, c + 0.5));
  return [{ weight: wp, mean: 0.5, sd: 0.16 }, { weight: 1 - wp, mean: -0.5, sd: 0.16 }];
}

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const ncdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

export type Confidence = "confident" | "cautious" | "uncertain";
export function densityStats(comps: MixComp[]): { mean: number; pPos: number; straddle: number; confidence: Confidence; reading: string } {
  const w = comps.reduce((s, c) => s + c.weight, 0) || 1;
  const pPos = comps.reduce((s, c) => s + c.weight * ncdf(c.mean / c.sd), 0) / w;
  const straddle = Math.min(pPos, 1 - pPos);
  const mean = mixtureMean(comps);
  let confidence: Confidence;
  if (straddle >= 0.3) confidence = "uncertain";
  else if (Math.abs(mean) >= 0.45 && straddle < 0.12) confidence = "confident";
  else confidence = "cautious";
  const reading =
    confidence === "uncertain" ? "Wide and straddling zero — genuinely uncertain. We can't call the direction."
    : confidence === "confident" ? "Narrow and far from zero — a confident, actionable prediction."
    : `Leaning collateral ${mean > 0 ? "resistance" : "sensitivity"}, but with real spread — read it cautiously.`;
  return { mean, pPos, straddle, confidence, reading };
}

export const DENS = { w: 380, h: 184, top: 36, base: 146, x0: TRACK.x0, x1: TRACK.x1 };

export function renderDensity(comps: MixComp[], point: number): string {
  const N = 96, px = (crs: number) => crsToTrackX(crs);
  const ys: number[] = [];
  let maxp = 0;
  for (let i = 0; i <= N; i++) { const p = mixturePdf(comps, -1 + (2 * i) / N); ys.push(p); if (p > maxp) maxp = p; }
  maxp = maxp || 1;
  const py = (p: number) => DENS.base - (p / maxp) * (DENS.base - DENS.top);
  const xy = (i: number) => `${px(-1 + (2 * i) / N).toFixed(1)} ${py(ys[i]).toFixed(1)}`;
  let line = `M ${xy(0)}`; for (let i = 1; i <= N; i++) line += ` L ${xy(i)}`;
  const fill = `M ${px(-1).toFixed(1)} ${DENS.base} L ${xy(0)}` + (() => { let s = ""; for (let i = 1; i <= N; i++) s += ` L ${xy(i)}`; return s; })() + ` L ${px(1).toFixed(1)} ${DENS.base} Z`;
  const tick = (c: number, label: string, anchor: string) => {
    const tx = px(c).toFixed(1);
    return `<line x1="${tx}" y1="${DENS.base}" x2="${tx}" y2="${DENS.base + 6}" class="crs-dtick"/>` +
      `<text x="${tx}" y="${DENS.base + 20}" class="crs-dlab" text-anchor="${anchor}">${label}</text>`;
  };
  const mx = px(point).toFixed(1);
  // Unique ids per render (no collisions). The fill is a full-width gradient RECT
  // CLIPPED to the density area — not a gradient-filled path. Chromium silently
  // drops a userSpaceOnUse gradient on a thin/near-degenerate path (a narrow,
  // confident density), but always rasterizes it on a rect; the clip restricts it
  // to the curve. (This is the real fix for the narrow-shape no-fill bug.)
  const rid = Math.random().toString(36).slice(2, 9);
  const gid = `cg${rid}`, cid = `cc${rid}`;
  return (
    `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${px(-1).toFixed(1)}" y1="0" x2="${px(1).toFixed(1)}" y2="0">` +
      `<stop offset="0" stop-color="var(--slate)"/><stop offset="0.5" stop-color="var(--rule)"/><stop offset="1" stop-color="var(--amber)"/></linearGradient>` +
      `<clipPath id="${cid}"><path d="${fill}"/></clipPath></defs>` +
    `<line x1="${px(0).toFixed(1)}" y1="${DENS.top - 8}" x2="${px(0).toFixed(1)}" y2="${DENS.base}" class="crs-dzero"/>` +
    `<rect class="crs-dfill" x="${px(-1).toFixed(1)}" y="0" width="${(px(1) - px(-1)).toFixed(1)}" height="${DENS.base}" fill="url(#${gid})" clip-path="url(#${cid})"/>` +
    `<path class="crs-dline" d="${line}" fill="none"/>` +
    `<line x1="${px(-1).toFixed(1)}" y1="${DENS.base}" x2="${px(1).toFixed(1)}" y2="${DENS.base}" class="crs-daxis"/>` +
    tick(-1, "−1 sensitivity", "start") + tick(0, "0", "middle") + tick(1, "+1 resistance", "end") +
    `<g class="crs-dmark" transform="translate(${mx} 0)">` +
      `<line x1="0" y1="${DENS.top - 8}" x2="0" y2="${DENS.base}" class="crs-dmark-l"/>` +
      `<text x="0" y="${DENS.top - 14}" class="crs-dmark-t" text-anchor="middle">${fmtCRS(point)}</text>` +
    `</g>`
  );
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
  const tick = (c: number, label: string, anchor: "start" | "middle" | "end") => {
    const tx = crsToTrackX(c).toFixed(1);
    return `<line x1="${tx}" y1="${TRACK.y - 7}" x2="${tx}" y2="${TRACK.y + 7}" class="crs-ttick"/>` +
      `<text x="${tx}" y="${TRACK.y + 26}" class="crs-tlab" text-anchor="${anchor}">${label}</text>`;
  };
  return (
    `<defs><linearGradient id="crs-grad" x1="0" x2="1" y1="0" y2="0">` +
      `<stop offset="0" stop-color="var(--slate)"/><stop offset="0.5" stop-color="var(--rule)"/>` +
      `<stop offset="1" stop-color="var(--amber)"/></linearGradient></defs>` +
    `<rect x="${TRACK.x0}" y="${TRACK.y - 4}" width="${TRACK.x1 - TRACK.x0}" height="8" rx="4" class="crs-track-bar" fill="url(#crs-grad)"/>` +
    tick(-1, "−1 sensitivity", "start") + tick(0, "0 uncertain", "middle") + tick(1, "+1 resistance", "end") +
    `<g class="crs-marker" transform="translate(${x} 0)">` +
      `<path d="M0 ${TRACK.y - 16} l7 -11 l-14 0 z" class="crs-marker-tri"/>` +
      `<text x="0" y="${TRACK.y - 31}" class="crs-marker-val" text-anchor="middle">${fmtCRS(crs)}</text>` +
    `</g>`
  );
}

// ===========================================================================
//  Layer 4 — the CRS landscape (context field)
//  Two context axes (environment on x, inflammation on y, each 0→1). The local
//  CRS is the example's confident lab value pulled toward 0 (uncertain) as the
//  context turns host-like / inflamed:
//      localCrs = baseCrs · (1 − clamp(env·pull₀ + inflam·pull₁, 0, 1))
//  Rendered as a hypsometric-banded contour field (rhymes with the site's
//  fitness-landscape spine) with a draggable marker. Local uncertainty is read
//  off the SAME Layer-3 machinery (genComponents + densityStats), so the layers
//  connect: drag toward the host corner and the prediction widens to a coin-flip.
// ===========================================================================
type Ctx = CrsConfig["context"];
type Ex = Ctx["example"];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function localCrs(env: number, inflam: number, ex: Ex): number {
  const pull = clamp01(env * ex.pull[0] + inflam * ex.pull[1]);
  return ex.baseCrs * (1 - pull);
}

const lerp3 = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

// Field tint. The example spans only [baseCrs → 0], a sliver of the absolute
// CRS scale, so an absolute slate→rule→amber ramp washes out. Instead we span
// that range: deep (confident, cool for sensitivity / warm for resistance) →
// pale (uncertain). The legend labels these endpoints, so it stays honest while
// reading as terrain. RGB literals are tuned to the tokens.css palette family.
export const FIELD_DEEP_COOL = [40, 74, 84];   // confident collateral sensitivity
export const FIELD_DEEP_WARM = [150, 96, 12];  // confident collateral resistance
export const FIELD_PALE = [214, 204, 182];     // ≈ 0, genuinely uncertain
export function fieldColor(crs: number, baseCrs: number): string {
  const t = Math.abs(baseCrs) < 1e-6 ? 0 : Math.min(1, Math.max(0, crs / baseCrs)); // 1 deep … 0 pale
  return lerp3(FIELD_PALE, baseCrs < 0 ? FIELD_DEEP_COOL : FIELD_DEEP_WARM, t);
}

// field geometry (one SVG user-unit system; plot box inside, labels around it)
export const FIELD = { w: 380, h: 360, x0: 58, x1: 356, y0: 18, y1: 300 };
export const fieldX = (env: number) => FIELD.x0 + env * (FIELD.x1 - FIELD.x0);
export const fieldY = (inflam: number) => FIELD.y1 - inflam * (FIELD.y1 - FIELD.y0);
export const xToEnv = (sx: number) => (sx - FIELD.x0) / (FIELD.x1 - FIELD.x0);
export const yToInflam = (sy: number) => (FIELD.y1 - sy) / (FIELD.y1 - FIELD.y0);

// convex-polygon half-plane clip (Sutherland–Hodgman); keeps points where f(p) ≥ 0.
type Pt = [number, number];
function clipHalf(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = f(a), db = f(b);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

// static field: hypsometric CRS bands + iso-CRS contour lines + axis frame.
// The field is linear in s = env·pull₀ + inflam·pull₁ until s ≥ 1, where the
// clamp pins CRS at 0 — a flat "uncertainty plateau" in the host-like corner.
// So every contour is a straight line s = k, computed and clipped analytically.
export function renderFieldBg(ctx: Ctx): string {
  const ex = ctx.example, b = ex.baseCrs, [p0, p1] = ex.pull;
  const s = (p: Pt) => p0 * p[0] + p1 * p[1];
  const crsAt = (sv: number) => b * (1 - Math.min(1, Math.max(0, sv)));

  // CRS levels baseCrs → 0; k(level) = 1 − level/base maps a level to its s-threshold.
  const levels: number[] = [];
  for (let L = b; L <= 1e-4; L += 0.1) levels.push(+L.toFixed(4));
  if (levels[levels.length - 1] !== 0) levels.push(0);
  const ks = levels.map((L) => 1 - L / b);          // evenly spaced 0 … 1
  const kCap = p0 + p1;                              // largest s the square allows
  const bounds = kCap > 1 ? [...ks, kCap] : [...ks]; // final band (s ≥ 1) is the plateau

  const sq: Pt[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const toXY = (p: Pt) => `${fieldX(p[0]).toFixed(1)},${fieldY(p[1]).toFixed(1)}`;
  let bands = "";
  for (let i = 0; i < bounds.length - 1; i++) {
    const lo = bounds[i], hi = bounds[i + 1];
    let poly = clipHalf(sq, (p) => s(p) - lo);
    poly = clipHalf(poly, (p) => hi - s(p));
    if (poly.length < 3) continue;
    const col = fieldColor(crsAt((lo + hi) / 2), b);
    bands += `<polygon class="crs-fband" points="${poly.map(toXY).join(" ")}" fill="${col}" stroke="${col}" stroke-width="0.75"/>`;
  }

  // contour for s = k: p0·env + p1·inflam = k, clipped to the unit square.
  const seg = (k: number): [Pt, Pt] | null => {
    const pts: Pt[] = [];
    const add = (x: number, y: number) => {
      if (x >= -1e-6 && x <= 1 + 1e-6 && y >= -1e-6 && y <= 1 + 1e-6)
        pts.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
    };
    if (Math.abs(p1) > 1e-9) { add(0, k / p1); add(1, (k - p0) / p1); }
    if (Math.abs(p0) > 1e-9) { add(k / p0, 0); add((k - p1) / p0, 1); }
    if (pts.length < 2) return null;
    let best: [Pt, Pt] = [pts[0], pts[1]], bd = -1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2;
      if (d > bd) { bd = d; best = [pts[i], pts[j]]; }
    }
    return best;
  };
  let contours = "";
  for (let i = 1; i < ks.length; i++) {
    const ln = seg(ks[i]); if (!ln) continue;
    const zero = levels[i] === 0;                    // the CRS = 0 plateau edge
    contours += `<line class="crs-fcontour${zero ? " zero" : ""}" x1="${fieldX(ln[0][0]).toFixed(1)}" y1="${fieldY(ln[0][1]).toFixed(1)}" x2="${fieldX(ln[1][0]).toFixed(1)}" y2="${fieldY(ln[1][1]).toFixed(1)}"/>`;
  }

  const cx = ((FIELD.x0 + FIELD.x1) / 2).toFixed(1), cy = ((FIELD.y0 + FIELD.y1) / 2).toFixed(1);
  const [ax, ay] = ctx.axes;
  const frame = `<rect x="${FIELD.x0}" y="${FIELD.y0}" width="${FIELD.x1 - FIELD.x0}" height="${FIELD.y1 - FIELD.y0}" class="crs-fframe"/>`;
  const labels =
    `<text x="${cx}" y="${FIELD.y1 + 22}" class="crs-faxis" text-anchor="middle">${esc(ax.label)}: ${esc(ax.from)} → ${esc(ax.to)}</text>` +
    `<text transform="translate(15 ${cy}) rotate(-90)" class="crs-faxis" text-anchor="middle">${esc(ay.label)}: ${esc(ay.from)} → ${esc(ay.to)}</text>`;
  return `<g class="crs-field-bg">${bands}${contours}${frame}${labels}</g>`;
}

// one marker on the field. interactive → focusable + arrow-key driven (the JS
// island swaps the static sample markers for a single draggable one).
export function renderFieldMarker(env: number, inflam: number, ex: Ex, interactive = false): string {
  const c = localCrs(env, inflam, ex);
  const x = fieldX(env).toFixed(1), y = fieldY(inflam).toFixed(1);
  const attrs = interactive
    ? ` class="crs-fmark is-draggable" tabindex="0" role="img" aria-label="${esc(`Context marker — local CRS ${fmtCRS(c)}. Arrow keys move it across environment and inflammation.`)}"`
    : ` class="crs-fmark"`;
  return (
    `<g${attrs} transform="translate(${x} ${y})">` +
      `<circle class="crs-fmark-halo" r="13"/>` +
      `<circle class="crs-fmark-dot" r="8" fill="${fieldColor(c, ex.baseCrs)}"/>` +
      `<text class="crs-fmark-val" y="-15" text-anchor="middle">${fmtCRS(c)}</text>` +
    `</g>`
  );
}
