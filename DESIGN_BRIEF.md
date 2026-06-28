# Design Brief — kylejcard.com, ground-up redesign ("Adaptive Walk")

## What this is

A **complete ground-up redesign** of Kyle Card's research website. Disregard all prior design work and all design choices from the old Squarespace site. The **only** thing carried over from the existing site (https://www.kylejcard.com) is the **text content** (copy). Everything visual and structural is open — and should be genuinely distinctive, not a generic portfolio template.

The goal: a site that looks like a senior freelance designer was paid $10k+ to build it. Contemporary, professional, confident, and unmistakably *this scientist's* — not AI-generated-looking.

> **This is a redesign-from-scratch, but reuse what still serves it:** the existing repo's content, the CV data, the colony video asset, the landscape schematics, headshots, and logos all carry over. The *design* starts fresh.

## The three locked decisions (do not relitigate these)

1. **Structure — ALL-IN.** The entire homepage **is** a single, continuous *adaptive walk across a fitness landscape*. There are **no** separate hero / about / research / team sections in the conventional sense. Instead, the content of each of those becomes a **"stop" along an unfurling trajectory** that climbs the landscape as the visitor scrolls (or navigates). The journey is the page.
2. **What the climb encodes — INTELLECTUAL ARC.** Elevation/progress along the trajectory maps to an *intellectual* progression, not strictly chronological: **foundational questions → key discoveries → clinical vision/future lab.** Early stops sit low (open questions, basic science); the trajectory ascends through Kyle's discoveries (contingency, genetic background, *S. aureus* collateral sensitivity) toward the high ground of the clinical vision (Evolution-on-a-Chip, predictive evolutionary medicine). "Higher" = closer to translational impact.
3. **Palette feel — WARM & EDITORIAL,** cream/sand tones, rich accent, magazine-like. **BUT SEE THE ANTI-GENERIC CONSTRAINT BELOW** — the warmth must be landscape-derived, not the default AI cream-and-terracotta.

## ⚠️ Anti-generic constraints (read carefully — the last attempt failed on exactly this)

The Frontend Design skill names three AI-design defaults to avoid. One of them is **"warm cream background (~#F4F1EA) + high-contrast serif display + terracotta accent."** The chosen warm/editorial palette is adjacent to that default, so you must actively differentiate:

- **Do NOT use the stock terracotta-on-cream-serif look.** No default terracotta (#C; rust/clay) as the primary accent. Derive the accent from Kyle's *own* research imagery instead — the blues, teals, and greens of his fitness-landscape schematics and the warm amber of a high-elevation "adaptive peak." The palette should read as *topography* (sand lowlands, vegetated mid-slopes, sunlit peaks), justified by the subject, not as generic editorial warmth.
- **Justify the warmth by the subject:** cream/sand = the pale terrain and contour paper of a fitness landscape / topographic map, not "because warm minimalism is trendy." If a color can't be traced to the landscape concept or Kyle's assets, reconsider it.
- The previous build failed by (a) treating "fitness landscape" as a decorative skin — a couple of superficial isoclines in a hero — rather than the organizing structure, and (b) using bright neon accents on black that screamed AI. **Do not repeat either.** The landscape is the architecture of the whole page; accents are sophisticated and earthy, never neon.
- Avoid every other generic-portfolio tell: no big-number-with-small-label hero, no 01/02/03 numbered feature cards unless the numbering encodes something true, no three-column "what I do" grid, no predictable top-nav-hero-about-projects-contact skeleton, no glassmorphism, no gratuitous gradient blobs.

## The signature: the adaptive walk (this is the whole site)

This is where essentially all the design boldness lives. Execute it with real craft.

- A **continuous fitness-landscape surface** is the substrate of the page — rendered as elegant topographic contours / a stylized terrain (SVG or canvas; see implementation). It is not a background texture bolted onto normal sections; the page's content lives *on* it.
- A **trajectory line** (the adaptive walk) threads from the lowest elevation at the top to the highest at the end, and the visitor follows it. As they scroll, the path draws/advances and the "current position" moves uphill.
- **Each stop is a plateau / labeled point on the walk** where the trajectory pauses and a piece of content unfurls — Kyle's introduction, his central question, each major finding (with its landscape schematic and paper link), the future lab + Evolution-on-a-Chip, the team, the contact. Content appears anchored to its position on the terrain, not in a generic card stack.
- **Elevation must mean something** (fitness / translational proximity), and the stops must be in a real intellectual order. This is "structure is information" — the climb is not decorative.
- Consider the colony-growth video and the existing landscape schematics as *materials* integrated into the terrain (e.g. the video as a living texture at one stop, the schematics as the literal peaks being described), not as separate embedded boxes.

### Stops (content, carried over from the live site — final copy pulled from www.kylejcard.com)
Suggested order along the ascent (refine as the design demands, but preserve this intellectual arc):
1. **Trailhead / identity** — name, "Predict. Control. Cure.", the one-line thesis. Lowest elevation, the widest view.
2. **The central question** — predictability of evolution; the about-paragraphs material (including Kyle's identity as a disabled scientist and his values — carry this copy faithfully).
3. **Discovery: history & contingency** — LTEE / *E. coli* relaxed-selection work; PLoS Biology + PNAS (2016886118) as elevation-marker paper links; landscape schematics 01/02.
4. **Discovery: genetic background & collateral sensitivity** — *S. aureus* vancomycin / CRS; PNAS (2507962122); staph image; schematics 03/04.
5. **The high ground: future lab & Evolution-on-a-Chip** — the clinical vision; this is the summit and should feel like it. (The chip explorer from before can live here, redesigned — see below.)
6. **The team** — climbers on the expedition; the 5 members.
7. **Contact** — `mailto:cardkyle1@gmail.com`, affiliations, logos.

## Evolution-on-a-Chip moment (at the summit)

The previous chip interactive looked superficial and AI-made (neon on black). Redesign it to match the new editorial-topographic identity: muted, sophisticated, scientifically faithful, the elevation palette. Keep it genuinely informative (the CF airway-on-a-chip anatomy and the Seed→Pressure→Evolve→Read out→Forecast logic from the research statement) but make it feel like a high-end journal's interactive graphical abstract, not a tech demo. If a full interactive risks feeling gimmicky here, an elegant, well-crafted static-with-subtle-motion figure is preferable to a flashy shallow one. Craft over flash.

## Other pages
- **/cv** — the existing structured CV (from `cv.yaml`) restyled to the new identity; HTML CV + prominent PDF download. Can carry a subtle topographic motif but prioritize clean readability.
- **/blog** — index + posts, restyled to the new identity.
- Keep nav minimal and unconventional if it serves the concept; ensure it's still usable and accessible.

## Tech stack & hosting

- **Astro is still recommended** and sufficient. It ships static HTML by default and supports interactive "islands" exactly where the adaptive-walk needs real JS — so the centerpiece interactivity is fully supported without abandoning a fast static site. Use vanilla JS or a focused library (e.g. D3 for terrain/contours, or hand-built SVG/canvas) only inside the island(s) that need it; keep the rest static.
- **You are free to choose a different framework** if it genuinely serves this build better (e.g. SvelteKit for richer interaction). If you do, justify it briefly. Don't add a heavyweight SPA framework just to have one.
- **Hosting:** If you stay on Astro static output (recommended), **GitHub Pages still works** — keep the existing deploy. If the chosen approach needs server-side rendering or edge functions, the recommended free hosts are **Cloudflare Pages** or **Netlify** (both free tiers are generous and support Astro/SvelteKit SSR; custom domain `www.kylejcard.com` works on all of them). **Tell Kyle explicitly** which host the final build targets and why, and what (if anything) changes about deployment and DNS. Default to the free option; do not introduce paid hosting without flagging it.

## Use BOTH design skills — actively, not passively

The previous attempt had the skills installed but didn't really drive the work with them. This time:

1. **UI/UX Pro Max skill** — actually run its design-system generator before building, e.g.:
   `python3 <skill>/scripts/search.py "research scientist portfolio editorial topographic warm sophisticated" --design-system -p "kylejcard"`
   then deep-dive domains as needed (`--domain style`, `--domain color`, `--domain typography`, `--domain ux`) and run its UX/anti-pattern validation pass before and after implementation. Use the `astro` stack guidance (`--stack astro`) unless you switch frameworks. Treat its output as input to synthesize, not gospel — but do run it.
2. **Frontend Design skill** — follow its full process: brainstorm a compact token system (4–6 named hex, deliberate display/body/utility type pairing, a layout concept with ASCII wireframes, and one signature element), then critique that plan against the "is this the generic default?" test and revise before coding. Spend boldness in one place (the adaptive walk) and keep everything else disciplined. Respect the quality floor.

## Process (required — do this, don't skip to code)

1. Pull final copy from https://www.kylejcard.com (all stops' text, verbatim where it's substantive prose; preserve species-name italics).
2. Run the UI/UX Pro Max design-system generator + relevant domain searches.
3. Produce a **design plan**: token system (palette with every hex justified by the landscape/subject, type pairing, spacing), the terrain/trajectory concept with an ASCII wireframe of the scroll journey, and how each stop is anchored on the landscape.
4. **Self-critique the plan** against the anti-generic constraints above — explicitly check: is the warm palette differentiated from the cream+terracotta+serif default? Is the landscape structural or decorative? Name what you changed.
5. **Show Kyle the design plan + a rendered preview of the trailhead and first one or two stops (screenshot)** for approval BEFORE building the whole site. Do not build all pages until the direction is approved.
6. Build incrementally; critique again with screenshots as you go.
7. Hold the quality floor: responsive to mobile (the adaptive walk must have a coherent mobile form — likely a vertical climb), visible keyboard focus, `prefers-reduced-motion` fallback (the full trajectory and all content legible and in order without animation), WCAG AA contrast, Lighthouse a11y ≥ 95 / perf ≥ 90, no payload bloat from the terrain rendering.

## Definition of done
- Homepage is a single coherent adaptive-walk experience; no generic section-stack fallback.
- Warm/editorial palette that is demonstrably landscape-derived and clearly NOT the stock cream+terracotta+serif AI default; accents earthy/sophisticated, never neon.
- All carried-over copy present and accurate; species italics preserved.
- Chip "summit" moment redesigned to the new identity, informative and crafted.
- /cv (HTML + PDF), /blog, /contact all restyled to the identity.
- Mobile + reduced-motion + a11y + Lighthouse targets met.
- Both skills demonstrably used (design-system output and Frontend Design plan reflected in the result).
- Kyle told which host the build targets and any DNS/deploy changes.
- README updated: framework, how to run, how the adaptive-walk island works, how to update CV/content, how to deploy, hosting choice.
