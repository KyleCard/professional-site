# Design Plan — "Adaptive Walk" (kylejcard.com ground-up redesign)

Status: **direction proposal for approval.** Copy pulled from the live site; palette/type/structure
derived per the brief using both design skills. Nothing in the full site is built yet — this plan plus the
`preview/` prototype (trailhead + first two stops) is the approval artifact.

---

## 1. The idea in one line

The page is an **isometric fitness landscape** — a Wright-style adaptive surface with peaks rising on the z-axis — and
you are walking it. The **adaptive walk climbs from a low valley up to a sunlit clinical summit**; every "section" of a
normal site is instead a **labeled stop (a peak) on that climb**. Elevation literally means *fitness → translational
proximity*: the higher you are, the closer to the clinic. The boldness is spent in exactly one place (the walk); type,
spacing, and color discipline stay quiet.

> **Direction update (after preview round 1):** Kyle chose an **isometric 3D surface** (peaks on the z-axis) over the
> top-down contour map. This is faithful to his *own* fitness-landscape figures (`assets/research/landscape-01..04.png`):
> axonometric surfaces, adaptive-walk paths, labeled spherical nodes, floor axis labels. We translate that schematic
> vocabulary into the **daylight warm palette** (his versions are white-on-black). The top-down contour build is kept at
> `preview/topdown.html` as the runner-up.

---

## 2. Palette — every value traced to Kyle's own research imagery

I sampled Kyle's actual figures and the colony video to derive the palette, rather than reaching for editorial defaults.
Sources observed: `landscape.png` (magma colormap: plum lowlands → amber peaks), `correlated landscapes.png`
(blue valleys/axes → red-amber peaks), the contingency schematic (teal data points), `landscape.svg`/`contours.png`
(slate-blue cartographic terrain), and `Bacterial growth.mp4` (a colony front in violet / ochre-gold / olive).

| Token | Hex | Role | Why this color (subject justification) |
|---|---|---|---|
| `--paper` | `#ECE3D0` | base ground | Pale **sand / contour paper** — the lowland terrain of a topo map. Warmer & sandier than the flagged `#F4F1EA` default, and never paired with terracotta. |
| `--paper-cool` | `#E7E4D9` | lowland stops | Faint cool wash at low elevation (foundational questions = cold, open ground). |
| `--paper-warm` | `#F3E7CC` | summit stops | Ground warms as you near the clinical peak — sunlight on high ground. |
| `--ink` | `#222D2A` | body text | Dark **slate-teal**, not pure black — sampled from colony-front shadows / terrain ink. ~13:1 on sand. |
| `--slate` | `#3C5A6A` | valleys, gauge axis, labels | The **cool valley** and Kyle's own **fitness-axis blue** from the landscape figures. |
| `--teal` | `#1C6B57` | **primary accent + links** | Kyle's **contingency-plot data teal** (`#46B8A0`), deepened to pass AA on sand. The "vegetated mid-slope." This cool accent is the deliberate break from the terracotta default. |
| `--amber` | `#B97E14` | upper-slope text/markers | **Ochre** of the magma upper slope + colony gold. Large text / elevation markers only. |
| `--amber-bright` | `#DE9F2A` | the summit word, the climber | **Sunlit peak** highlight. Appears *only* high on the climb (the word "Cure.", the "you-are-here" dot) — color is elevation-encoded, so amber is *earned*, never decorative. |
| `--rule` | `#CBBFA6` | hairlines | Contour-paper gridline tone. |

Contour isolines are tinted along the same low→high ramp (slate → teal → ochre) at low opacity, so the terrain reads
as hypsometric (elevation-tinted) without ever fighting the text.

---

## 3. Typography — editorial, but not the editorial default

The brief's locked direction is "magazine/editorial," and the UI/UX generator's first answer was the exact default it
warns about (**Playfair Display + Inter**, a high-contrast didone on cream). I rejected that.

- **Display — Fraunces** (variable, optical sizing, soft/wonk axes). A characterful *old-style* serif with warmth and a
  little eccentricity — deliberately **not** the clean Playfair/Bodoni didone. Used with restraint: the trailhead thesis
  and stop titles only. Light weight at display optical size, tight tracking.
- **Body — IBM Plex Sans.** Humanist, technical, scientific-instrument provenance; superb legibility at small sizes.
- **Labels / data — IBM Plex Mono**, uppercase, wide-tracked. This is the **cartographic layer**: elevation readouts
  ("ELEV 980 M"), coordinates ("41.50°N 81.62°W"), eyebrows, and paper citations all set in mono — the way a real
  topographic map letters its margins. This mono-as-map-label system is the type move that breaks from the all-serif
  editorial cliché.

*(Alternative considered and noted for your call: inverting to a characterful grotesque display — e.g. Bricolage
Grotesque — over a serif body. I went with Fraunces because its soft optical display on "Predict. Control. Cure."
is more memorable and warmer. Happy to swap if you prefer the grotesque route.)*

---

## 4. Terrain & trajectory — structure, not decoration (ISOMETRIC)

- **Substrate:** an **isometric shaded surface** rendered on a `<canvas>` from an fbm value-noise heightfield + gaussian
  peaks at each stop (projected axonometrically, flat-shaded with a directional light + aerial-haze depth, hypsometric
  tint sand→sage→ochre→amber, light wireframe mesh). Canvas keeps payload tiny (the JS + heightfield params, no giant
  SVG), renders crisp at any DPI, and the reduced-motion path simply draws it once. The content stays real DOM text for
  a11y and ordering. (The runner-up top-down generator `tools/terrain.mjs` produced ~15 KB baked SVG and remains available.)
- **The stops are literally peaks.** Each stop is a gaussian summit in the surface, ascending toward the clinical summit —
  the terrain encodes the arc. Labeled spherical nodes + drop-stems sit on each peak (echoing Kyle's figures).
- **The adaptive walk:** a smooth Catmull-Rom path lifted onto the surface, drawn slate→teal→amber with a light casing so
  it reads against any terrain colour. It **draws in as you scroll**; an amber climber marks "you are here."
- **Scroll model (to build on approval):** the hero is the establishing shot of the whole landscape; as you scroll, a
  **sticky camera travels the walk**, settling on each successive peak as that stop's content panel appears. Fallback
  (reduced-motion / no-JS / mobile): the static establishing shot + stacked content sections in arc order, each with its
  peak vignette — already proven in `preview/` shots 01–04.
- A **fitness axis** (z-axis, with arrow) is drawn on the surface and floor edges are hinted — the "up = more fit = closer
  to the clinic" semantics made explicit, exactly as in Kyle's genotype-space figures. *Structure is information.*

### ASCII wireframe — the scroll journey (desktop)

```
  FITNESS↑                                            ascend ↓ (scroll)
  ┌───┐
  │   │   ⟁ TRAILHEAD · elev 60 m ........... ·°· dashed route ahead
  │░  │        Predict. Control. [Cure.]                    ◦ node
  │░  │        thesis · Kyle Card, Ph.D.
  │░  │
  │▒  │                          STOP 01 · THE QUESTION ◦───╮
  │▒  │              "Can we read evolution before it       │  [portrait
  │▒  │               happens?"  + disabled-scientist        │   on slope]
  │▓  │   ╭─trail draws as you climb──────────╯
  │▓  │   STOP 02 · DISCOVERY · elev 980 m ◦
  │▓  │   History matters.  E. coli / LTEE
  │█  │   [correlated-landscape schematic = the peak]
  │█  │   ▲980 m PLoS Biology   ▲1120 m PNAS
  │█  │                          STOP 03 · MODELS→PATHOGENS ◦
  │█  │              S. aureus · vancomycin · CRS  [colony video texture]
  │██ │   ╭──────────────────────────────────╯
  │███│   ★ SUMMIT · THE FUTURE LAB ◦  Evolution-on-a-Chip
  │███│      "Where persistence meets resistance"  (amber peak)
  │███│   STOP · THE TEAM (climbers)   STOP · CONTACT (basecamp)
  └───┘
  gauge fills →                              higher = closer to the clinic
```

On **mobile** the same walk becomes a vertical climb: contours simplify, the trajectory runs as a left spine, the gauge
docks to the bottom as a horizontal fill, content stacks in arc order.

---

## 5. Stop-by-stop anchoring (full site, 7 stops)

1. **Trailhead** (elev ~60 m) — name, *Predict. Control. Cure.*, the one-line thesis. Widest view, sparse lowland contours.
2. **The central question** (~340 m) — the about/values copy + portrait anchored on the slope; the disabled-scientist
   identity and inclusivity commitment carried verbatim.
3. **Discovery · history & contingency** (~980 m) — *E. coli* / LTEE; the correlated-landscape schematic **is** the peak;
   PLoS Biology + PNAS 2016886118 as elevation-marker links.
4. **Discovery · models → pathogens** (~1240 m) — *S. aureus* vancomycin / CRS; the colony video as a *living texture* at
   this stop; PNAS 2507962122; staph schematic.
5. **The summit · future lab & Evolution-on-a-Chip** (~1850 m) — the clinical vision; a redesigned, muted **graphical-abstract**
   chip figure (Seed → Pressure → Evolve → Read out → Forecast), amber peak moment.
6. **The team** — the five members as the expedition party, pinned along the ridge.
7. **Contact** — basecamp: mailto, Cleveland Clinic / HHMI affiliations + logos.

---

## 6. Self-critique vs. the anti-generic constraints (what I changed)

- **Is the palette differentiated from cream + terracotta + serif?** Yes, on all three legs. (a) The accent is **teal**
  (cool), with amber strictly elevation-gated — there is **no terracotta** anywhere. (b) The display face is **Fraunces**
  (soft optical old-style), explicitly not the Playfair/Bodoni didone the generator proposed. (c) The "cream" is a **living
  hypsometric terrain** that shifts cool→warm as you climb, not a flat #F4F1EA field. I *rejected the generator's literal
  output* (Playfair/Inter, Portfolio-Grid pattern) and kept only its scroll/IO mechanics.
- **Is the landscape structural or decorative?** Structural. The contour field spans the whole document; the stops are
  actual peaks in the heightfield; the trajectory and the live fitness gauge encode the intellectual arc. Remove the
  landscape and the page loses its information architecture — that's the test the last build failed, and this one passes.
- **Other generic tells avoided:** no big-number hero, no 01/02/03 card grid (the numbering here is a *real* ascending
  sequence with elevations), no three-column "what I do," no glassmorphism, no gradient blobs, no neon, no black.
- **What I changed during the preview pass:** the trajectory first rendered too faint — undersold the one idea that
  matters — so I strengthened the trail weight, added a soft halo, enlarged the peak node rings, and lifted contour
  presence, while keeping body text at AA. The signature now reads as the organizing line of the page.

---

## 7. Quality floor, stack & hosting

- **Stack: Astro static + islands → GitHub Pages (unchanged).** The terrain is baked SVG; only the small scroll/gauge
  island ships JS. No SSR/edge needed, so **no host or DNS change** — `www.kylejcard.com` stays exactly as is.
- **A11y / perf targets:** semantic headings, skip link, visible focus, AA contrast (ink ~13:1; teal ≥4.5:1 verified),
  `prefers-reduced-motion` fully drawn + static + in-order (already working in preview shot 06), terrain ~15 KB gzip,
  transform/opacity-only animation. Targeting Lighthouse a11y ≥ 95 / perf ≥ 90.

---

## 8. Open items to resolve before the full build (flagged, not guessed)

1. **The previous Astro site is gone from disk** — the repo holds only `DESIGN_BRIEF.md`. Raw assets live in
   `Nextcloud/Assets/`. I'm rebuilding from live-site copy + those assets; please confirm there isn't a newer repo copy
   I should start from.
2. **Team headshots missing** — no photos for Justin Creary, Amira Stocks, Shiva Ayyar, Rohan Desai, Aryan Agarwal in the
   assets. Options: pull from the live site, you provide them, or an elegant initial/contour-marker placeholder per member.
3. **Structured CV data (`cv.yaml`) is gone** — only PDFs remain (`Documents/CV/CV - 090725.pdf`). For `/cv` I can transcribe
   the latest PDF back into structured data, or you hand me a fresh export. (The served PDF is also ~Sept 2025 — older than
   your June 2026 package; a re-export would be good.)
