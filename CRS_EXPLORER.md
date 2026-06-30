# Spec Module — Interactive "Collateral Response Score (CRS) Explorer"

> A self-contained interactive component for kylejcard.com, to live at the summit / clinical-vision stop of the adaptive-walk homepage (and/or as a standalone showcase). This module slots into the ground-up redesign in `DESIGN_BRIEF.md` and must adopt that site's visual identity (warm/editorial, landscape-derived palette — **NOT** the dark, neon-accented look of Kyle's talk slides). **Borrow the intention of Kyle's talk, never the slide design.**

## Purpose
Let a visitor *feel* what the Collateral Response Score measures — that its **sign = direction** of collateral response and its **magnitude = predictability** — by manipulating inputs and watching CRS respond live. Then extend to pathway-dependent collateral profiles, to the uncertainty distribution, and finally to how CRS could shift across clinical/environmental contexts (the motivation for the Evolution-on-a-Chip platform).

**This is an illustrative teaching tool, not a presentation of Kyle's experimental data.** It does NOT need to use Kyle's real measured CRS values or name the specific antibiotics tested against the *S. aureus* lines. Use **generic drug labels ("Drug A", "Drug B", "Drug C", …)** and generic pathway labels — this removes jargon, makes the concept accessible to a broad audience, and means nothing in the component claims to be empirical results. Because the whole tool is conceptual/illustrative by design, there is no measured-vs-hypothetical line to police across layers; just keep the values plausible and the teaching honest (don't imply a specific clinical claim).

Build as four progressively-deeper layers. A visitor must grasp Layer 1 in ~5 seconds before being invited deeper; later layers are revealed by scroll or tab, not all at once.

---

## The CRS definition (implement exactly)
For a given second-line drug, each evolved replicate has a resistance response **R** = log₂(MIC_evolved / MIC_ancestor) (positive = collateral resistance; negative = collateral sensitivity).

- **R̄** = mean of the replicate responses.
- **max(|R|)** = the maximum possible absolute response given the measurement scale (the normalizer; in Kyle's talk the worked example uses a scale where this = 1). Implement the normalizer as the max absolute value attainable on the chosen axis range, so CRS stays bounded on **[−1, 1]**. (Worked example to reproduce exactly: replicates at +1, +1, +1, −1 → R̄ = 0.5, max(|R|) = 1 → **CRS = 0.5**.)
- **CRS = R̄ / max(|R|)**, displayed to 2 decimals.

Interpretation copy (use this language):
- **CRS → +1**: uniform collateral **resistance** — predictable, bad (second-line drug likely fails).
- **CRS → −1**: uniform collateral **sensitivity** — predictable, exploitable (second-line drug likely works).
- **CRS ≈ 0**: replicates **diverge** — maximal evolutionary **uncertainty**; outcome unpredictable.
- Emphasize the non-obvious point: *the same R̄ can arise from agreement or from a near-even split — and the explorer should let the user produce that surprise themselves.*

---

## Layer 1 — Live CRS calculator (the anchor; build this first)
A single-drug dot-plot the user directly manipulates.

- **Y-axis:** log₂-relative MIC (resistance change vs. ancestor), with a dashed zero line. Range e.g. −1 … +1 (label the ends "collateral sensitivity" low / "collateral resistance" high).
- **X-axis:** a single drug (one column of replicate dots).
- **Interaction:** the user drags replicate dots up/down; and can add/remove replicates (e.g. + / − buttons, 2–8 replicates). On every change, recompute R̄ and CRS live.
- **Output:** a **CRS track** beneath the plot — a horizontal scale from −1 to 0 to +1 with an animated marker at the current CRS. Plus a one-line plain-language readout that updates, e.g. *"3 of 4 replicates evolved cross-resistance; net CRS = +0.50 — leaning predictable resistance."* When dots are split near 50/50, the readout flips to *"replicates diverge — outcome highly uncertain (CRS ≈ 0)."*
- **The teaching beat:** include a small "try this" nudge or a preset button ("Show me how the same average hides disagreement") that arranges dots into two configurations with the same R̄ but very different spreads, so the sign/magnitude distinction lands.
- Color: use the site's landscape palette — e.g. cool/low tones for sensitivity (below zero), warm/high tones for resistance (above zero), so it rhymes with the elevation metaphor. No neon.

## Layer 2 — Pathway collateral profile (the divergent-fork idea)
Step out from one drug to a full panel of second-line drugs, illustrating the key idea that different evolutionary pathways produce different — and partly predictable — collateral profiles.

- A **pathway toggle**: two generically-labeled evolutionary routes, e.g. **"Pathway 1"** vs **"Pathway 2"** (or evocative-but-generic names like "Route A / Route B"). No need to name the real WalKR-regulon / *rpsU* genetics — keep it accessible.
- Show CRS computed across a generic second-line panel — **Drug A, Drug B, Drug C, …** (pick ~6–8 drugs). Render as a compact row of per-drug CRS values or a small ridgeline/strip, one per drug.
- **The interaction is the comparison:** toggling pathway visibly **inverts** several drugs — one pathway trends toward collateral **sensitivity** for some drugs, while the other trends the opposite way. Caption states the takeaway: an early evolutionary fork produces opposite, and partly predictable, collateral profiles — so knowing which path a pathogen took tells you something about which second-line drugs will still work.
- The illustrative values can be hand-designed to make the inversion clear and pedagogically crisp. No empirical-data labeling needed; this is a concept demonstration.

## Layer 3 — CRS as a distribution, not a point estimate
Surface the bootstrap idea: CRS has uncertainty, and the *width* is the actionable quantity.

- For a selected drug+pathway, show a **distribution** of CRS as a small density/ridgeline (reshapes when the user changes selection).
- Teach the reading: a **narrow** density far from 0 = confident, actionable prediction; a **wide** or **bimodal** density straddling 0 = "we genuinely cannot call this outcome."
- A subtle marker for the point estimate sits on the distribution so Layers 1–3 connect visually.
- The distributions are illustrative (hand-designed or generated to teach the narrow-vs-wide contrast); store them as static JSON the component reads. No empirical-data labeling needed.

## Layer 4 — CRS across clinical & environmental contexts
The forward-looking payoff, tying CRS to the Evolution-on-a-Chip thesis: collateral outcomes may depend on the *context* in which evolution happens.

- Since the entire explorer is illustrative, this layer doesn't need special "not real data" badging to distinguish it from earlier layers. But it should still be **framed honestly as a forward-looking idea**, not an established result: copy frames context-dependence as *what the Evolution-on-a-Chip platform is designed to measure* — the open question, not a solved one. Avoid implying that specific context→CRS shifts have been demonstrated.
- **Context controls (sliders/toggles)** that reshape the CRS profile:
  - Environment: standard lab media → CF airway-on-a-chip (host-like).
  - Inflammatory state (low → high), or drug concentration, as a second axis.
  - Optionally: starting genetic background.
- **Illustrative behavior to encode:** e.g. a drug that reads as predictable collateral sensitivity (CRS ≈ −0.7) in a simple environment drifts toward CRS ≈ 0 (unpredictable) in a host-like, inflamed environment — visually arguing *why context-aware measurement matters.* The specific curves are designed for pedagogy.
- **Optional "CRS landscape" treatment (ties to the site's spine):** render context-dependence as a surface — two context axes with CRS as a heatmap/contour field and a draggable marker showing local CRS + its uncertainty. This visually rhymes with the site's fitness-landscape metaphor (CRS as its own *landscape of predictability*). Build this only if it can be done elegantly; otherwise the sliders-reshape-profile version is sufficient.
- End Layer 4 with a one-line bridge to the platform: the chip + real-time sensors are how these projected relationships could become measured ones.

---

## Cross-cutting requirements
- **Faithful, not borrowed:** capture the *intent* of Kyle's talk (build intuition for sign=direction, magnitude=predictability, then pathway-dependence, then context-dependence). Do **not** reproduce the slides' dark background, neon yellow/blue, or layouts. Use the site's identity.
- **Progressive disclosure:** Layer 1 readable instantly; deeper layers revealed on scroll/tab. Never dump all four at once.
- **Data sourcing:** all layers use illustrative values, hand-designed or generated to teach each concept clearly. Store them in a small JSON/config the component reads (drug labels, per-pathway per-drug CRS values, distributions, context curves), so the values are easy to tune without touching component logic. Use generic labels throughout (Drug A/B/C…, Pathway 1/2). Scaffold the config with sensible defaults; no need for Kyle to supply real experimental numbers.
- **Honest framing:** the tool teaches the CRS concept generically; it should not claim to present Kyle's specific experimental results or specific clinical findings. Layer 4 in particular frames context-dependence as a forward-looking question the platform will address, not an established result.
- **Accessibility:** every drag interaction needs a keyboard equivalent (arrow keys to move a selected replicate; inputs for replicate count). ARIA labels on controls; CRS value and readout announced via an aria-live region. Don't rely on color alone for sign — pair with position and text.
- **Graceful degradation / reduced motion:** with JS off or `prefers-reduced-motion`, render a static but complete version — the worked example (CRS = 0.5), the two real pathway profiles, a representative distribution, and a static conceptual figure — all legible and correctly labeled. No information locked behind interaction.
- **Performance:** lightweight (SVG/canvas + vanilla JS or a small lib like D3). Precompute distribution data rather than resampling live if it saves payload. Keep within the site's Lighthouse targets (perf ≥ 90, a11y ≥ 95).
- **Mobile:** dragging must work on touch; layers stack vertically; the CRS track and readout stay visible while manipulating dots.

## Definition of done
- Layer 1 calculator computes CRS exactly per the formula (reproduces the +1,+1,+1,−1 → 0.5 example) and updates live with a clear plain-language readout.
- Layer 2 pathway toggle visibly inverts the collateral profile (Pathway 1 vs Pathway 2) across generic Drug A/B/C… labels.
- Layer 3 shows CRS as a distribution with the narrow-vs-wide reading taught.
- Layer 4 frames context-dependence honestly as a forward-looking idea, with context controls that reshape CRS and a bridge to the chip platform.
- Generic, jargon-free labels throughout (no real drug names, no real pathway genetics required).
- Site identity (not slide design); full keyboard + reduced-motion + mobile support; within Lighthouse targets.
- Illustrative values read from an external config with a documented schema, easy to tune.
