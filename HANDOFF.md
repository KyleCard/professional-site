# Handoff — resume here (CRS Explorer, mid-build)

_Last updated: 2026-06-30. Written to hand a long session off to a fresh one._

## How to resume
1. Read `CRS_EXPLORER.md` (the module spec) and `DESIGN_BRIEF.md` + `DESIGN_PLAN.md` (site identity).
2. Read this file fully, then the three CRS files (below).
3. **All four CRS layers are now built.** The CRS Explorer is feature-complete; remaining work is the §"Pending after the CRS Explorer" list (mobile-nav hamburger, quality-floor/Lighthouse pass, README).
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

**Layer 4 (done — the CRS landscape):** tab `04 Context` + panel `data-crs-context`. A **2-D context field** (env x, inflammation y, each 0→1) rendered as a **hypsometric-banded contour landscape** — deep cool (confident sensitivity) at lab/low → pale (uncertain) at the host-like corner, with a flat "uncertainty plateau" where the model clamps CRS to 0. A **draggable marker** (pointer + click-to-place + **arrow keys** + Home/End) reads local CRS off the model `localCrs = baseCrs·(1 − clamp(env·pull₀ + inflam·pull₁, 0, 1))`; the side panel reuses Layer 3's `genComponents`+`densityStats`+`renderDensity` so the **density widens to a coin-flip** as you climb (confident → cautious → genuinely uncertain). Honest forward-looking framing + one-line chip bridge. No-JS fallback = the static field + two labelled sample points (lab/low → −0.70 confident, host/high → ≈0 uncertain) + readings + caption. Reduced-motion safe (no transitions), touch-draggable, mobile stacks (tabs **wrap** on narrow screens). New `crs-core` exports: `localCrs`, `fieldColor`, `FIELD`/`fieldX`/`fieldY`/`xToEnv`/`yToInflam`, `clamp01`, `renderFieldBg`, `renderFieldMarker`; `densityStats` gained a `confidence` word (additive — L3 output unchanged). Field tint is a **data-spanning** ramp ([baseCrs→0] as deep→pale), NOT the absolute slate→amber CRS scale, because the example covers only a sliver of [−1,1] and an absolute ramp washed out; the legend labels the endpoints so it stays honest. Contours are straight analytic lines (the model is piecewise-linear in `s = env·pull₀+inflam·pull₁`), clipped to the unit square — robust to non-round `baseCrs` if Kyle tunes it.

## Architecture conventions / gotchas (READ before editing the component)
1. **Astro scoped CSS does NOT reach `set:html`/`innerHTML` content.** Style injected SVG/HTML with `.realAncestor :global(.injectedClass)` (e.g. `.crs-density :global(.crs-dfill)`). Real template elements use normal scoped selectors. This bit us twice.
2. **SVG gradient fills — don't fill a thin path with a gradient.** Chromium **silently drops** a `url(#grad)` fill on a thin/near-degenerate path (e.g. a narrow, confident density spike) even when the gradient is `userSpaceOnUse` with a unique id and the path's bbox is full — the markup inspects as correct but no pixels paint. Wide shapes paint fine, so it looks intermittent. The robust fix (used in `renderDensity`): fill a **full-size `<rect fill="url(#grad)">` clipped by the path** (`<clipPath><path d=…/></clipPath>` + `clip-path="url(#clip)"`). A rect always rasterizes; the clip restricts it to the curve. Still keep ids **unique per render** (random suffix) and gradients `userSpaceOnUse`. (Earlier handoffs claimed unique-id + userSpaceOnUse was the fix — it was not; that only masked it on the wide examples we happened to test.)
3. **`[hidden]` is overridden by an explicit `display:grid/flex`** — add a `.x[hidden]{display:none}` guard.
4. **No-JS / progressive-enhancement pattern:** server-render a complete fallback; the island sets `.fallback.hidden=true` and `.interactive.hidden=false`. Tabs are hidden until JS (`.crs-card.js-tabs .crs-tabs{display:flex}`); panels stack with `.crs-panel-h` headings for no-JS, hidden once `.js-tabs`. Render the interactive's initial state from JS (don't rely on the SSR copy).
5. `.crs-ready` is added per-panel to enable transitions; reduced-motion disables them.

## Run & screenshot
- Build: `npm run build`. Preview server: `npm run preview` → http://localhost:4321 (serves `dist`).
- Screenshot: start the preview server, then `node tools/shot-site.mjs` (headless Edge over CDP, output → `preview/shots/`). Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Shots support: `path, w, h, dsf, mobile, scrollTo, clicks:[selectors], reduce, settle, eval (JS run after clicks), afterEval, nojs (disables page scripts to capture the no-JS fallback)`. Kill stray procs first: `taskkill //F //IM msedge.exe //T; taskkill //F //IM node.exe //T`.
- **Caching gotchas (these burned time):** (1) `npm run preview` can keep serving a **stale in-memory** build after you rebuild — restart it (kill node, `npm run preview` again) to be safe; verify with `curl -s localhost:4321/ | grep <expected>`. (2) The headless-Edge profile **disk-caches** pages across runs; `shot-site.mjs` now sends `Network.setCacheDisabled`, but if you still see stale output, `rm -rf C:/Users/cardk/AppData/Local/Temp/edge-shot2`. (3) `.reveal` elements fade in via a `.js .reveal{opacity:0}` → `.in` transition; a screenshot taken in the first ~0.7s after scroll catches them mid-fade (washed). The page is fine for real users — just settle longer or force `.reveal.in` before capturing.
- Verify CRS logic quickly with an inline `node --input-type=module -e "…"` mirroring `crs-core` (we did this for the formula + readout edge cases).

## Kyle's working style
Meticulous tester (he found the readout-baseline bug and the gradient-fill bug — verify edge cases). Wants verbatim copy + preserved species/journal italics elsewhere on the site; **flag, don't guess**; ask before choices the spec doesn't cover. Commits/pushes himself. Has made manual edits we KEPT (footer logo sizes/signature, `crs.ts` preset label "Full agreement", node-tag offset, etc.) — re-read files before editing in case he changed them.

## Pending after the CRS Explorer
- Kyle's **homepage ideas** (he said he'd send them).
- **Mobile nav** needs a hamburger menu (links currently crowd the brand on narrow screens).
- **Quality-floor pass:** Lighthouse (a11y ≥ 95 / perf ≥ 90), WCAG AA incl. hero-text-over-video and the amber summit word ("Cure." ≈ 2.7:1 on sand — darken to ≥ 3:1), keyboard/focus audit, reduced-motion, mobile sweep.
- **README**: framework, how to run, how the adaptive-walk island + CRS Explorer work, how to update CV/blog/CRS config, deploy (GitHub Pages, unchanged).
