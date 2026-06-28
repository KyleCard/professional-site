// recolor-figures.mjs — convert Kyle's dark genotype-space figures (white wireframe
// on black, blue + dusty-rose adaptive walks) into daylight line art for the warm
// page: transparent background, dark-ink wireframe, paths re-tinted slate-blue + teal,
// and node glyphs (A / B / AB) kept LIGHT for legibility on the coloured node fills.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const PAPER = [236, 227, 208], INK = [30, 40, 36], SLATE = [56, 86, 104], TEAL = [27, 105, 88];
const GLYPH = [245, 242, 232]; // light node-letter colour
const mix = (a, b, t) => [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t);
const root = fileURLToPath(new URL("..", import.meta.url));
const files = ["landscape-01", "landscape-02", "landscape-03", "landscape-04"];

const isBlue = (r, g, b) => b >= g && b - r > 10;
const isRose = (r, g, b) => r >= b && r - b > 8;

for (const name of files) {
  const src = `${root}assets/research/${name}.png`;
  const dst = `${root}assets/research/${name}-day.png`;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, Hh = info.height;

  // pass 1: mask of "coloured" pixels (the two walks + node fills)
  const colored = new Uint8Array(W * Hh);
  for (let p = 0, o = 0; p < W * Hh; p++, o += 4) {
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    if (sat > 0.20 && luma > 40 && luma < 232 && (isBlue(r, g, b) || isRose(r, g, b))) colored[p] = 1;
  }
  // is a bright pixel surrounded by coloured fill? → it's a node glyph
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const RADII = [5, 10, 16];
  const nearColoured = (x, y) => {
    let c = 0;
    for (const [dx, dy] of DIRS) for (const rad of RADII) {
      const sx = Math.min(W - 1, Math.max(0, x + dx * rad)), sy = Math.min(Hh - 1, Math.max(0, y + dy * rad));
      if (colored[sy * W + sx]) c++;
    }
    return c >= 4;
  };

  // pass 2: write daylight pixels
  const out = Buffer.alloc(data.length);
  for (let y = 0, p = 0; y < Hh; y++) for (let x = 0; x < W; x++, p++) {
    const o = p * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    let R, G, B, A;
    if (colored[p]) {
      [R, G, B] = isBlue(r, g, b) ? SLATE : TEAL; A = 255;
    } else {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const t = Math.min(1, (luma / 255) * 1.06);
      if (luma > 205) {                       // wireframe OR node glyph
        if (nearColoured(x, y)) { [R, G, B] = GLYPH; A = 255; }   // light letter
        else { [R, G, B] = INK; A = 255; }                       // dark wireframe
      } else {                                // facets, floor labels, anti-aliasing
        A = Math.max(0, Math.min(1, (t - 0.02) / 0.12)) * 255;
        [R, G, B] = mix(PAPER, INK, t);
      }
    }
    out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = A;
  }
  await sharp(out, { raw: { width: W, height: Hh, channels: 4 } }).png().toFile(dst);
  console.log("daylight →", `${name}-day.png`);
}
