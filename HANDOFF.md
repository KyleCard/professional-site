# Handoff — resume here (CRS Explorer, mid-build)

_Last updated: 2026-06-30. Written to hand a long session off to a fresh one._

## How to resume
1. Read `CRS_EXPLORER.md` (the module spec) and `DESIGN_BRIEF.md` + `DESIGN_PLAN.md` (site identity).
2. Read this file fully, then the three CRS files (below).
3. The next task is **Layer 4 — the CRS landscape** (see §Layer 4). Layers 1–3 are done and approved.
4. Build incrementally; screenshot as you go (§Run & screenshot); show Kyle before/after.

## Site state (kylejcard.com redesign — "Adaptive Walk")
Astro 5.13, static → GitHub Pages (custom domain `www.kylejcard.com`, `public/CNAME`). **Built & working:** homepage (video hero → 5-stop scrollytelling isometric climb via `src/scripts/landscape.ts` → Evolution-on-a-Chip graphical-abstract `src/components/Chip.astro` → team → contact), `/cv` (data-driven from `src/data/cv.yaml`), `/blog` (content collection `src/content/blog/`, 4 posts), `/contact` (map image + links), slim site-wide `Footer.astro`. Palette/type tokens in `src/styles/tokens.css`. Everything builds (`npm run build` → 8 pages). Kyle **commits/pushes himself** (repo `github.com/KyleCard/professional-site`) — never push or touch DNS/GitHub settings.

## CRS Explorer — current state
An illustrative teaching interactive at the homepage summit (rendered by `<CrsExplorer />` in `src/pages/index.astro`, right after the `.chip-feature` section). **Generic labels only** (Drug A/B…, Pathway 1/2) — no real antibiotic names, no real pathway genetics, nothing claims to be empirical data.

Three files:
- **`src/components/CrsExplorer.astro`** — shared header + a tabbed card. Frontmatter server-renders the no-JS fallbacks. Markup = `role="tablist"` with tabs `01 Calculator` / `02 Pathways` / `03 Distribution` (+ add `04 Context`), and one `role="tabpanel"` each. Scoped `<style>`. A client island `<script>` with classes: `Tabs` (a11y tabs), `CrsCalc` (L1), `PathwayProfile` (L2), `DistributionView` (L3), instantiated at the bottom.
- **`src/scripts/crs-core.ts`** — pure logic + SVG-string render helpers, imported by BOTH the Astro frontmatter (server/no-JS render) and the island (so they can't drift). Geometry consts (`PLOT`, `TRACK`, `MINIBAR`, `DENS`), `computeCRS`, `readout`/`tallyRows`, `renderPlot`/`renderTrack`, L2 `renderProfileRows`/`crsMiniX`/`profileSummary`, L3 `mixturePdf`/`genComponents`/`densityStats`/`renderDensity`.
- **`src/data/crs.ts`** — illustrative config; `CrsConfig` interface IS the documented schema. `axis`, `layer1` (replicates/presets), `drugs`, `pathways` (per-drug CRS, hand-designed to invert P1↔P2), `distributions` (optional L3 overrides; else generated), `context` (L4 axes + example). Kyle may tune these freely.

**Layer 1 (done):** drag/keyboard replicate dots on a log₂-MIC plot; `CRS = mean(R)/max(|R|)` (normalizer = max axis |value| = 1 → worked example `[1,1,1,-1]=0.50`); a CRS track + a **tally** (Cross-resistance / Collateral sensitivity / No change counts) + a qualitative interpretation. Interp distinguishes all-baseline ("No collateral change") from divergence ("Replicates diverge — uncertain"). No "net CRS = …" in prose (it's on the track). aria-live announces counts+CRS+interp.

**Layer 2 (done):** Pathway 1⇄2 radiogroup toggle; per-drug mini CRS bars (teal=sensitivity, amber=resistance) that **invert** on toggle (markers animate). No-JS fallback shows both profiles.

**Layer 3 (done):** pathway + drug radiogroups; a **density** (Gaussian-mixture) that reshapes; narrow-far = confident, wide/bimodal-straddling-0 = uncertain (auto reading from `densityStats`). Point-estimate marker = the L2 CRS value (connects layers). Fill uses a `userSpaceOnUse` gradient with a **unique id per render**. No-JS fallback = a confident + an uncertain example.

## Layer 4 — what to build (CRS landscape)
Spec: `CRS_EXPLORER.md` §"Layer 4". Config: `CRS.context` = `{ axes: [{id:"env",from:"Lab media",to:"Airway-on-chip"},{id:"inflam",from:"Low",to:"High"}], example:{ drug:"Drug A", baseCrs:-0.7, pull:[0.55,0.5] } }`.

Plan (the chosen "CRS landscape" option, not just sliders):
- Add tab `04 Context` + panel `data-crs-context`.
- A **2-D field** over the two context axes (env on x, inflammation on y, each 0→1) with a **draggable marker** (pointer + **arrow-key** keyboard). The field is a heatmap/contour of local CRS — rhyme with the site's fitness-landscape spine (contour bands, the cool→warm CRS gradient).
- **Local CRS model:** `localCrs(env,inflam) = baseCrs * (1 − clamp(env*pull[0] + inflam*pull[1], 0, 1))` → a confident lab CRS (≈ −0.7) **drifts toward 0 (uncertain)** as context becomes host-like/inflamed. Derive the local uncertainty with `genComponents(localCrs)` + `densityStats` and show it (a small density and/or a confidence word) at the marker.
- **Honest framing copy:** context-dependence is *what the Evolution-on-a-Chip platform is designed to measure* — an open question, not an established result. End with a one-line bridge to the chip.
- **Quality floor (match L1–L3):** draggable marker has a full keyboard equivalent (arrows move it across the field; announce local CRS + reading via aria-live); don't rely on color alone (marker position + value text); **no-JS fallback** = the static field + 2 labeled sample points (e.g. "Lab / low → −0.7, confident" and "Chip / high → ≈0, uncertain"); reduced-motion safe; touch-draggable; mobile stacks.
- If the surface proves un-elegant, the spec permits a simpler "sliders reshape a CRS readout" version — but Kyle chose to **attempt the landscape** first.

## Architecture conventions / gotchas (READ before editing the component)
1. **Astro scoped CSS does NOT reach `set:html`/`innerHTML` content.** Style injected SVG/HTML with `.realAncestor :global(.injectedClass)` (e.g. `.crs-density :global(.crs-dfill)`). Real template elements use normal scoped selectors. This bit us twice.
2. **SVG `url(#id)` paint servers:** make the id **unique per render** (random suffix) and prefer `gradientUnits="userSpaceOnUse"`. Duplicate ids + `objectBoundingBox` caused a fill bug on narrow shapes.
3. **`[hidden]` is overridden by an explicit `display:grid/flex`** — add a `.x[hidden]{display:none}` guard.
4. **No-JS / progressive-enhancement pattern:** server-render a complete fallback; the island sets `.fallback.hidden=true` and `.interactive.hidden=false`. Tabs are hidden until JS (`.crs-card.js-tabs .crs-tabs{display:flex}`); panels stack with `.crs-panel-h` headings for no-JS, hidden once `.js-tabs`. Render the interactive's initial state from JS (don't rely on the SSR copy).
5. `.crs-ready` is added per-panel to enable transitions; reduced-motion disables them.

## Run & screenshot
- Build: `npm run build`. Preview server: `npm run preview` → http://localhost:4321 (serves `dist`).
- Screenshot: start the preview server, then `node tools/shot-site.mjs` (headless Edge over CDP, output → `preview/shots/`). Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Shots support: `path, w, h, dsf, mobile, scrollTo, clicks:[selectors], reduce, settle`. Kill stray procs first: `taskkill //F //IM msedge.exe //T; taskkill //F //IM node.exe //T`.
- Verify CRS logic quickly with an inline `node --input-type=module -e "…"` mirroring `crs-core` (we did this for the formula + readout edge cases).

## Kyle's working style
Meticulous tester (he found the readout-baseline bug and the gradient-fill bug — verify edge cases). Wants verbatim copy + preserved species/journal italics elsewhere on the site; **flag, don't guess**; ask before choices the spec doesn't cover. Commits/pushes himself. Has made manual edits we KEPT (footer logo sizes/signature, `crs.ts` preset label "Full agreement", node-tag offset, etc.) — re-read files before editing in case he changed them.

## Pending after the CRS Explorer
- Kyle's **homepage ideas** (he said he'd send them).
- **Mobile nav** needs a hamburger menu (links currently crowd the brand on narrow screens).
- **Quality-floor pass:** Lighthouse (a11y ≥ 95 / perf ≥ 90), WCAG AA incl. hero-text-over-video and the amber summit word ("Cure." ≈ 2.7:1 on sand — darken to ≥ 3:1), keyboard/focus audit, reduced-motion, mobile sweep.
- **README**: framework, how to run, how the adaptive-walk island + CRS Explorer work, how to update CV/blog/CRS config, deploy (GitHub Pages, unchanged).
