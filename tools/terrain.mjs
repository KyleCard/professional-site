// terrain.mjs — generate a fitness-landscape contour field as crisp SVG isolines.
// The substrate of the whole site: a topographic map whose "peaks" ARE the stops.
// Marching squares over an fbm value-noise heightfield + gaussian bumps at each stop.
// Output: writes preview/terrain.js setting window.TERRAIN = { width, height, levels, nodes, paths }.
// Reusable in production (Astro) by importing genTerrain().
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ---- seeded value noise -------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const G = 256, grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const smooth = (t) => t * t * (3 - 2 * t);
  const at = (xi, yi) => grid[((yi & (G - 1)) * G + (xi & (G - 1)))];
  function vnoise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }
  return function fbm(x, y) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < 4; o++) { sum += amp * vnoise(x * freq, y * freq); norm += amp; amp *= 0.5; freq *= 2; }
    return sum / norm;
  };
}

// ---- marching squares ---------------------------------------------------
function isolines(field, cols, rows, cell, level) {
  const segs = [];
  const lerp = (a, b) => (level - a) / (b - a || 1e-6);
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = field[r * cols + c], tr = field[r * cols + c + 1];
      const bl = field[(r + 1) * cols + c], br = field[(r + 1) * cols + c + 1];
      let id = 0;
      if (tl > level) id |= 8; if (tr > level) id |= 4; if (br > level) id |= 2; if (bl > level) id |= 1;
      if (id === 0 || id === 15) continue;
      const x = c * cell, y = r * cell;
      const T = () => [x + cell * lerp(tl, tr), y];
      const B = () => [x + cell * lerp(bl, br), y + cell];
      const L = () => [x, y + cell * lerp(tl, bl)];
      const R = () => [x + cell, y + cell * lerp(tr, br)];
      const push = (p, q) => segs.push([p, q]);
      switch (id) {
        case 1: push(L(), B()); break;
        case 2: push(B(), R()); break;
        case 3: push(L(), R()); break;
        case 4: push(T(), R()); break;
        case 5: push(L(), T()); push(B(), R()); break;
        case 6: push(T(), B()); break;
        case 7: push(L(), T()); break;
        case 8: push(L(), T()); break;
        case 9: push(T(), B()); break;
        case 10: push(L(), B()); push(T(), R()); break;
        case 11: push(T(), R()); break;
        case 12: push(L(), R()); break;
        case 13: push(B(), R()); break;
        case 14: push(L(), B()); break;
      }
    }
  }
  return segs;
}

// stitch short segments into polylines by endpoint matching (quantized hash)
function stitch(segs) {
  const key = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
  const starts = new Map();
  segs.forEach((s, i) => {
    const k = key(s[0]); if (!starts.has(k)) starts.set(k, []); starts.get(k).push(i);
  });
  const used = new Array(segs.length).fill(false);
  const lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const line = [segs[i][0], segs[i][1]];
    let grow = true;
    while (grow) {
      grow = false;
      const tail = line[line.length - 1];
      const cand = starts.get(key(tail)) || [];
      for (const j of cand) { if (!used[j]) { used[j] = true; line.push(segs[j][1]); grow = true; break; } }
    }
    if (line.length > 1) lines.push(line);
  }
  return lines;
}

// ---- terrain assembly ---------------------------------------------------
export function genTerrain({ width = 1240, height = 1860, cell = 18, seed = 73, nLevels = 15, nodes = [] }) {
  const cols = Math.ceil(width / cell) + 1, rows = Math.ceil(height / cell) + 1;
  const noise = makeNoise(seed);
  const field = new Float32Array(cols * rows);
  const ns = 0.0042; // noise scale
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell, y = r * cell;
      let h = noise(x * ns + 11, y * ns + 7);          // base ruggedness
      h = 0.30 + 0.42 * h;                              // compress into lowland band
      for (const n of nodes) {                          // each stop is a real peak
        const dx = (x - n.x), dy = (y - n.y);
        const d2 = dx * dx + dy * dy;
        h += n.amp * Math.exp(-d2 / (2 * n.sigma * n.sigma));
      }
      field[r * cols + c] = h;
    }
  }
  let min = Infinity, max = -Infinity;
  for (const v of field) { if (v < min) min = v; if (v > max) max = v; }
  const levels = [];
  for (let i = 1; i <= nLevels; i++) {
    const t = i / (nLevels + 1);
    const level = min + (max - min) * t;
    const lines = stitch(isolines(field, cols, rows, cell, level))
      .map((ln) => ln.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]));
    levels.push({ t: Math.round(t * 1000) / 1000, level: Math.round(level * 1000) / 1000, lines });
  }
  return { width, height, min, max, levels, nodes };
}

// build SVG <path> d-strings grouped by level (low → high) for theming
function toPaths(terrain) {
  return terrain.levels.map((lv) => {
    const d = lv.lines.map((ln) => "M" + ln.map((p) => `${p[0]} ${p[1]}`).join(" L")).join(" ");
    return { t: lv.t, d };
  });
}

// ---- run: write preview/terrain.js -------------------------------------
const W = 1240, H = 3000;
// Stops as ascending peaks (y grows downward = climbing toward summit at the bottom).
// x alternates to make the trajectory meander like a real adaptive walk.
const nodes = [
  { id: "trailhead", x: W * 0.28, y: H * 0.070, amp: 0.10, sigma: 300, label: "TRAILHEAD" },
  { id: "question",  x: W * 0.64, y: H * 0.340, amp: 0.22, sigma: 290, label: "THE QUESTION" },
  { id: "history",   x: W * 0.33, y: H * 0.630, amp: 0.36, sigma: 280, label: "DISCOVERY · CONTINGENCY" },
  { id: "summit",    x: W * 0.66, y: H * 0.930, amp: 0.66, sigma: 320, label: "SUMMIT" },
];
const terrain = genTerrain({ width: W, height: H, cell: 18, seed: 73, nLevels: 16, nodes });
const out = {
  width: terrain.width, height: terrain.height,
  paths: toPaths(terrain),
  nodes: nodes.map((n) => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y), label: n.label })),
};
const dest = new URL("../preview/terrain.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, "window.TERRAIN = " + JSON.stringify(out) + ";\n");
const pts = out.paths.reduce((a, p) => a + (p.d.match(/L/g)?.length || 0), 0);
console.log(`terrain → ${dest}\n  ${out.paths.length} levels, ${out.nodes.length} nodes, ~${pts} vertices, ${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);
