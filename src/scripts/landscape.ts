/* ============================================================================
   landscape.ts — the isometric fitness-landscape engine.

   One heightfield (fbm noise + a gaussian peak at every stop) is projected
   axonometrically and rendered once to an offscreen "map" canvas. Two
   controllers draw from that map:
     • Panorama — the static establishing shot in the hero.
     • Climb    — the scrollytelling graphic; a gentle camera focuses each peak
                  as its step scrolls in, the adaptive walk draws toward it.

   Design: peaks on the z-axis = fitness; the walk climbs slate→teal→amber to a
   sunlit summit (Evolution-on-a-Chip). Warm daylight palette (DESIGN_PLAN §2).
   ============================================================================ */

export interface Stop {
  id: string; x: number; y: number; amp: number; sig: number;
  label: string; summit?: boolean;
}

// genotype × pressure space (x,y ∈ 0..1); peaks ascend toward the clinical summit.
// One node per content stop in the climb (the hero is a separate video).
export const STOPS: Stop[] = [
  { id: "question",  x: 0.13, y: 0.86, amp: 0.16, sig: 0.12, label: "The question" },
  { id: "clinic",    x: 0.31, y: 0.66, amp: 0.34, sig: 0.115, label: "Limiting resistance" },
  { id: "history",   x: 0.50, y: 0.49, amp: 0.58, sig: 0.105, label: "History & contingency" },
  { id: "staph",     x: 0.69, y: 0.31, amp: 0.82, sig: 0.10, label: "Collateral sensitivity" },
  { id: "summit",    x: 0.87, y: 0.15, amp: 1.35, sig: 0.125, label: "Evolution-on-a-Chip", summit: true },
];
const RIDGES = [
  { x: 0.62, y: 0.62, amp: 0.26, sig: 0.07 },
  { x: 0.40, y: 0.34, amp: 0.30, sig: 0.08 },
  { x: 0.78, y: 0.52, amp: 0.22, sig: 0.06 },
];

// ---- seeded value-noise heightfield -----------------------------------------
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const G = 256, grid = new Float32Array(G * G);
(() => { const r = mulberry32(73); for (let i = 0; i < grid.length; i++) grid[i] = r(); })();
const sm = (t: number) => t * t * (3 - 2 * t);
const at = (x: number, y: number) => grid[(y & (G - 1)) * G + (x & (G - 1))];
function vn(x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0);
  const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
function fbm(x: number, y: number) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let o = 0; o < 4; o++) { s += a * vn(x * f, y * f); n += a; a *= 0.5; f *= 2; }
  return s / n;
}
export function H(x: number, y: number): number {
  let h = 0.12 * fbm(x * 5 + 11, y * 5 + 7) + 0.05 * fbm(x * 11 + 3, y * 11 + 19);
  for (const s of STOPS) { const dx = x - s.x, dy = y - s.y; h += s.amp * Math.exp(-(dx * dx + dy * dy) / (2 * s.sig * s.sig)); }
  for (const s of RIDGES) { const dx = x - s.x, dy = y - s.y; h += s.amp * Math.exp(-(dx * dx + dy * dy) / (2 * s.sig * s.sig)); }
  return h;
}
let ZMIN = 9, ZMAX = -9;
for (let i = 0; i <= 80; i++) for (let j = 0; j <= 80; j++) { const v = H(i / 80, j / 80); if (v < ZMIN) ZMIN = v; if (v > ZMAX) ZMAX = v; }

// ---- hypsometric ramp (sand valley → sage → ochre → amber peak) --------------
const RAMP: [number, number[]][] = [
  [0, [231, 222, 200]], [0.30, [206, 188, 142]], [0.55, [129, 146, 120]], [0.78, [192, 131, 52]], [1, [230, 168, 52]],
];
const PAPER = [236, 227, 208];
function ramp(t: number) {
  t = Math.max(0, Math.min(1, t));
  let a = RAMP[0], b = RAMP[RAMP.length - 1];
  for (let i = 0; i < RAMP.length - 1; i++) if (t >= RAMP[i][0] && t <= RAMP[i + 1][0]) { a = RAMP[i]; b = RAMP[i + 1]; break; }
  const u = (t - a[0]) / ((b[0] - a[0]) || 1);
  return [0, 1, 2].map((k) => a[1][k] + (b[1][k] - a[1][k]) * u);
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

// ---- axonometric projection (auto-fit to the offscreen map) ------------------
const TILT = 0.6, ZEXPO = 1.0;
function rawProject(x: number, y: number, z: number): [number, number] {
  const u = x - 0.5, v = y - 0.5;
  return [u - v, (u + v) * TILT - z * ZEXPO];
}

export interface SurfaceMap {
  surf: HTMLCanvasElement | OffscreenCanvas;
  W: number; H: number;
  toSurf: (x: number, y: number, z: number) => [number, number];
  nodes: { stop: Stop; ax: number; ay: number; sx: number; sy: number; baseY: number }[];
  walk: number[][];
  walkStopT: number[];
}

// render the whole landscape once, at high resolution
export function buildSurface(surfW = 2200): SurfaceMap {
  // fit bbox
  let minX = 9, maxX = -9, minY = 9, maxY = -9;
  for (let i = 0; i <= 90; i++) for (let j = 0; j <= 90; j++) {
    const [rx, ry] = rawProject(i / 90, j / 90, H(i / 90, j / 90));
    if (rx < minX) minX = rx; if (rx > maxX) maxX = rx; if (ry < minY) minY = ry; if (ry > maxY) maxY = ry;
  }
  const margin = surfW * 0.04;
  const scale = (surfW - 2 * margin) / (maxX - minX);
  const surfH = Math.round((maxY - minY) * scale + 2 * margin);
  const toSurf = (x: number, y: number, z: number): [number, number] => {
    const [rx, ry] = rawProject(x, y, z);
    return [margin + (rx - minX) * scale, margin + (ry - minY) * scale];
  };

  const surf = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(surfW, surfH) : document.createElement("canvas");
  surf.width = surfW; (surf as HTMLCanvasElement).height = surfH;
  const ctx = (surf as HTMLCanvasElement).getContext("2d")!;

  const light = (() => { const v = [-0.55, -0.5, 0.92]; const m = Math.hypot(v[0], v[1], v[2]); return v.map((c) => c / m); })();
  const N = 96;
  const cells: [number, number][] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cells.push([i, j]);
  cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  for (const [i, j] of cells) {
    const x0 = i / N, x1 = (i + 1) / N, y0 = j / N, y1 = (j + 1) / N;
    const z00 = H(x0, y0), z10 = H(x1, y0), z11 = H(x1, y1), z01 = H(x0, y1);
    const p00 = toSurf(x0, y0, z00), p10 = toSurf(x1, y0, z10), p11 = toSurf(x1, y1, z11), p01 = toSurf(x0, y1, z01);
    const t = ((z00 + z10 + z11 + z01) / 4 - ZMIN) / (ZMAX - ZMIN);
    const ax = [x1 - x0, 0, z10 - z00], ay = [0, y1 - y0, z01 - z00];
    let nx = ax[1] * ay[2] - ax[2] * ay[1], ny = ax[2] * ay[0] - ax[0] * ay[2], nz = ax[0] * ay[1] - ax[1] * ay[0];
    const nm = Math.hypot(nx, ny, nz) || 1; nx /= nm; ny /= nm; nz /= nm;
    const diff = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
    const sh = 0.52 + 0.72 * diff;
    let c = ramp(t).map((v) => Math.min(255, v * sh));
    const haze = (1 - (x0 + y0) / 2) * 0.16; c = c.map((v, k) => v * (1 - haze) + PAPER[k] * haze);
    ctx.beginPath();
    ctx.moveTo(p00[0], p00[1]); ctx.lineTo(p10[0], p10[1]); ctx.lineTo(p11[0], p11[1]); ctx.lineTo(p01[0], p01[1]); ctx.closePath();
    ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctx.fill();
    const major = (i % 8 === 0 || j % 8 === 0);
    ctx.strokeStyle = major ? "rgba(40,52,46,0.16)" : "rgba(40,52,46,0.07)";
    ctx.lineWidth = major ? surfW / 1600 : surfW / 2600; ctx.stroke();
  }

  const nodes = STOPS.map((stop) => {
    // snap the marker to the surface's *visual* apex near the peak (the highest
    // point on screen), so the node sits exactly on the optimum, not front-right of it
    let ax = stop.x, ay = stop.y, best = Infinity;
    for (let dx = -0.06; dx <= 0.06; dx += 0.012)
      for (let dy = -0.06; dy <= 0.06; dy += 0.012) {
        const x = stop.x + dx, y = stop.y + dy;
        const py = toSurf(x, y, H(x, y))[1];
        if (py < best) { best = py; ax = x; ay = y; }
      }
    const [sx, sy] = toSurf(ax, ay, H(ax, ay) + 0.006);
    const [, baseY] = toSurf(ax, ay, 0);
    return { stop, ax, ay, sx, sy, baseY };
  });
  const walk = catmull(nodes.map((n) => [n.ax, n.ay]));
  const walkStopT = nodes.map((_, i) => (i * 26) / (walk.length - 1));
  return { surf, W: surfW, H: surfH, toSurf, nodes, walk, walkStopT };
}

// ---- the adaptive-walk path (Catmull-Rom through the peaks) ------------------
function catmull(pts: number[][], seg = 26): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// draw the walk + nodes in screen space, given a world→screen mapper
function drawWalk(
  ctx: CanvasRenderingContext2D, sm: SurfaceMap,
  map: (x: number, y: number, z: number) => [number, number],
  progress: number, active: number, scale: number,
) {
  const WALK = sm.walk;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const lim = Math.max(1, Math.floor(WALK.length * progress));
  const lift = (p: number[]) => map(p[0], p[1], H(p[0], p[1]) + 0.006);
  // shadow
  ctx.beginPath();
  for (let i = 0; i <= lim && i < WALK.length; i++) { const q = map(WALK[i][0], WALK[i][1], H(WALK[i][0], WALK[i][1]) + 0.004); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
  ctx.strokeStyle = "rgba(25,34,30,0.22)"; ctx.lineWidth = 9 * scale; ctx.stroke();
  // light casing
  ctx.beginPath();
  for (let i = 0; i <= lim && i < WALK.length; i++) { const q = lift(WALK[i]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
  ctx.strokeStyle = "rgba(247,242,228,0.95)"; ctx.lineWidth = 7 * scale; ctx.stroke();
  // coloured trail slate → teal → amber
  for (let i = 1; i <= lim && i < WALK.length; i++) {
    const t = i / WALK.length;
    const col = t < 0.5 ? mix([60, 90, 118], [28, 107, 87], t / 0.5) : mix([28, 107, 87], [222, 159, 42], (t - 0.5) / 0.5);
    const a = lift(WALK[i - 1]), b = lift(WALK[i]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; ctx.lineWidth = 4.2 * scale; ctx.stroke();
  }
  // nodes (drawn at the snapped visual apex)
  sm.nodes.forEach((n, idx) => {
    const s = n.stop;
    const top = map(n.ax, n.ay, H(n.ax, n.ay) + 0.006), base = map(n.ax, n.ay, 0);
    ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(base[0], base[1]);
    ctx.strokeStyle = "rgba(40,70,86,0.30)"; ctx.lineWidth = 1 * scale; ctx.setLineDash([2 * scale, 4 * scale]); ctx.stroke(); ctx.setLineDash([]);
    const on = idx <= active;
    const r = (s.summit ? 11 : 7.5) * scale * (idx === active ? 1.25 : 1);
    ctx.beginPath(); ctx.arc(top[0], top[1], r + 2.5 * scale, 0, 7); ctx.fillStyle = "rgba(247,242,228,0.92)"; ctx.fill();
    const g = ctx.createRadialGradient(top[0] - r * 0.4, top[1] - r * 0.5, 1, top[0], top[1], r);
    const core = s.summit ? ["#F4CB66", "#C8881E"] : on ? ["#EAF3EE", "#1C6B57"] : ["#EAE2D0", "#8c9a90"];
    g.addColorStop(0, core[0]); g.addColorStop(1, core[1]);
    ctx.beginPath(); ctx.arc(top[0], top[1], r, 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.6 * scale; ctx.strokeStyle = s.summit ? "#9a6a12" : on ? "#13483b" : "#6f7c72"; ctx.stroke();
    if (idx === active) { ctx.beginPath(); ctx.arc(top[0], top[1], r + 6 * scale, 0, 7); ctx.strokeStyle = "rgba(28,107,87,0.5)"; ctx.lineWidth = 1.4 * scale; ctx.stroke(); }
  });
}

const prefersReduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---- Panorama: static establishing shot -------------------------------------
export class Panorama {
  constructor(private canvas: HTMLCanvasElement, private labels: HTMLElement, private map = buildSurface()) {
    this.draw(); addEventListener("resize", () => this.draw(), { passive: true });
    if ((document as any).fonts?.ready) (document as any).fonts.ready.then(() => this.placeLabels());
  }
  private dpr = 1; private vw = 0; private vh = 0; private cam = { sx0: 0, sy0: 0, vwid: 0, vhei: 0 };
  draw() {
    const ctx = this.canvas.getContext("2d")!;
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    this.canvas.width = this.vw * this.dpr; this.canvas.height = this.vh * this.dpr;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // fit whole surface into the canvas (contain), anchored to the bottom
    const s = Math.min(this.vw / this.map.W, this.vh / this.map.H) * 1.02;
    const vwid = this.vw / s, vhei = this.vh / s;
    const sx0 = (this.map.W - vwid) / 2;
    const sy0 = this.map.H - vhei; // anchor bottom (foreground)
    this.cam = { sx0, sy0, vwid, vhei };
    ctx.clearRect(0, 0, this.vw, this.vh);
    ctx.drawImage(this.map.surf as CanvasImageSource, sx0, sy0, vwid, vhei, 0, 0, this.vw, this.vh);
    const map = (x: number, y: number, z: number): [number, number] => {
      const [px, py] = this.map.toSurf(x, y, z);
      return [(px - sx0) / vwid * this.vw, (py - sy0) / vhei * this.vh];
    };
    drawWalk(ctx, this.map, map, 1, STOPS.length - 1, this.vw / vwid * 1.1);
    this.placeLabels();
  }
  private placeLabels() {
    const { sx0, sy0, vwid, vhei } = this.cam;
    this.labels.innerHTML = this.map.nodes.map(({ stop, sx, sy }) => {
      const left = ((sx - sx0) / vwid * 100).toFixed(2), top = ((sy - sy0) / vhei * 100).toFixed(2);
      if (+left < -4 || +left > 104 || +top < -6 || +top > 104) return "";
      return `<div class="node-tag${stop.summit ? " summit" : ""}" style="left:${left}%;top:${top}%"><b>${stop.label}</b></div>`;
    }).join("");
  }
}

// ---- Climb: scrollytelling camera -------------------------------------------
export class Climb {
  private dpr = 1; private vw = 0; private vh = 0;
  private cam = { fx: 0, fy: 0, zoom: 1, prog: 0 };
  private target = { fx: 0, fy: 0, zoom: 1, prog: 0 };
  private from = { ...this.cam };
  private active = 0; private t0 = 0; private dur = 950; private raf = 0; private animating = false;
  constructor(private canvas: HTMLCanvasElement, private labels: HTMLElement, private map = buildSurface()) {
    this.resize();
    addEventListener("resize", () => { this.resize(); this.render(); }, { passive: true });
    this.snapTo(0); this.render();
  }
  private camFor(i: number) {
    const n = this.map.nodes[i];
    // gentle zoom-in as we climb; keep context around the focused peak
    const zoom = 1.32 + i * 0.2;
    // bias focus slightly toward the incoming route (down-left of the peak)
    return { fx: n.sx - this.map.W * 0.03, fy: n.sy + this.map.H * 0.05, zoom, prog: this.map.walkStopT[i] };
  }
  private snapTo(i: number) { this.active = i; this.cam = this.camFor(i); this.target = { ...this.cam }; }
  focusStop(i: number) {
    i = Math.max(0, Math.min(STOPS.length - 1, i));
    if (i === this.active && !this.animating) return;
    this.active = i; this.target = this.camFor(i);
    if (prefersReduced()) { this.cam = { ...this.target }; this.render(); return; }
    this.from = { ...this.cam }; this.t0 = performance.now(); this.animating = true;
    cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    const k = Math.min(1, (now - this.t0) / this.dur), e = easeInOut(k);
    (["fx", "fy", "zoom", "prog"] as const).forEach((p) => { this.cam[p] = this.from[p] + (this.target[p] - this.from[p]) * e; });
    this.render();
    if (k < 1) this.raf = requestAnimationFrame(this.tick); else this.animating = false;
  };
  private resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    this.canvas.width = this.vw * this.dpr; this.canvas.height = this.vh * this.dpr;
    this.canvas.getContext("2d")!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  private render() {
    const ctx = this.canvas.getContext("2d")!;
    const baseS = Math.min(this.vw / this.map.W, this.vh / this.map.H);
    const s = baseS * this.cam.zoom;
    const vwid = this.vw / s, vhei = this.vh / s;
    let sx0 = this.cam.fx - vwid / 2, sy0 = this.cam.fy - vhei * 0.5;
    sx0 = Math.max(-vwid * 0.18, Math.min(this.map.W - vwid * 0.82, sx0));
    sy0 = Math.max(-vhei * 0.18, Math.min(this.map.H - vhei * 0.82, sy0));
    ctx.clearRect(0, 0, this.vw, this.vh);
    ctx.drawImage(this.map.surf as CanvasImageSource, sx0, sy0, vwid, vhei, 0, 0, this.vw, this.vh);
    const map = (x: number, y: number, z: number): [number, number] => {
      const [px, py] = this.map.toSurf(x, y, z);
      return [(px - sx0) / vwid * this.vw, (py - sy0) / vhei * this.vh];
    };
    drawWalk(ctx, this.map, map, this.cam.prog, this.active, (this.vw / vwid) / baseS * 0.5 + 0.5);
    // labels for visible nodes
    this.labels.innerHTML = this.map.nodes.map(({ stop, sx, sy }, idx) => {
      const left = ((sx - sx0) / vwid * 100), top = ((sy - sy0) / vhei * 100);
      if (left < -8 || left > 108 || top < -8 || top > 108) return "";
      const lit = idx === this.active ? " lit" : "";
      return `<div class="node-tag${stop.summit ? " summit" : ""}${lit}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%"><b>${stop.label}</b></div>`;
    }).join("");
  }
}
