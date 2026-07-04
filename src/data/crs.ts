// ============================================================================
//  CRS Explorer — illustrative configuration (NOT empirical data).
//
//  Everything here is a teaching value, hand-tuned for clarity. Generic labels
//  only ("Drug A…", "Pathway 1/2"). Tune these numbers freely without touching
//  component logic in src/scripts/crs-core.ts or src/components/CrsExplorer.astro.
// ============================================================================

export interface CrsConfig {
  /** log₂ relative-MIC axis. The CRS normalizer max(|R|) = max(|min|,|max|),
   *  i.e. the largest absolute response the axis allows (= 1 for a ±1 axis),
   *  so CRS stays bounded on [−1, 1]. step = keyboard/drag increment. */
  axis: { min: number; max: number; step: number };

  /** Layer 1 — the live calculator (single drug, draggable replicate dots). */
  layer1: {
    drug: string;
    /** Replicate responses R, each in [axis.min, axis.max].
     *  Default reproduces the worked example: +1,+1,+1,−1 → CRS = 0.50. */
    replicates: number[];
    minReplicates: number;
    maxReplicates: number;
    /** Preset arrangements — several share a CRS but differ in spread, which
     *  is the whole lesson (magnitude ≈ predictability, sign = direction). */
    presets: { id: string; label: string; note: string; replicates: number[] }[];
  };

  /** Layer 2 — collateral profile across a generic second-line panel. */
  drugs: string[];
  /** Per pathway: a CRS value for each drug (aligned to `drugs`). The two
   *  pathways are designed to visibly invert several drugs. */
  pathways: { id: string; label: string; crs: number[] }[];

  /** Layer 3 — CRS as a distribution. Each entry is a small Gaussian mixture
   *  the component renders into a density (narrow/far = confident; wide or
   *  bimodal across 0 = genuinely uncertain). Keyed by `${pathwayId}:${drug}`. */
  distributions: Record<string, { components: { weight: number; mean: number; sd: number }[] }>;

  /** Layer 4 — context-dependence (forward-looking; the chip's open question). */
  context: {
    /** Two context sliders, each 0 → 1 (left label → right label). */
    axes: { id: string; label: string; from: string; to: string }[];
    /** Illustrative drug whose confident lab CRS shifts toward 0 (uncertain)
     *  as the context becomes host-like / inflamed. `pull` = how strongly each
     *  axis (at value 1) drags CRS toward 0, in [0,1]. */
    example: { drug: string; baseCrs: number; pull: number[] };
  };

  /** Layer 5 — is the shift itself predictable? (smooth vs rugged reaction norms)
   *  Two topographies over the SAME (env x, inflammation y) ∈ [0,1]² domain as
   *  Layer 4, reusing its axis labels. The surface elevation is CRS:
   *
   *      surface(x,y) = start + (end − start)·((x+y)/2)          ← the smooth plane
   *                   + ruggedness · Σ amp·sin(kxπx)·sin(kyπy)   ← boundary-zero ripple
   *
   *  Each ripple mode is zero on the whole unit-square boundary (sin(kπ·0)=
   *  sin(kπ·1)=0), so BOTH pathways share the exact CRS at the start corner
   *  (0,0 = lab medium, low inflammation) and the far corner (1,1 = chip, high
   *  inflammation) — the shared-endpoints constraint — while differing entirely
   *  in the path between. Pathway 1 uses ruggedness 0 (a smooth basin); Pathway 2
   *  adds the ripples (ridges + local reversals). Values clamp to [−1, 1].
   *  Tune `ripples`/`ruggedness` freely; endpoints stay pinned by construction. */
  layer5: {
    /** CRS at the start corner (lab medium, low inflammation). */
    start: number;
    /** CRS at the far corner (airway-on-chip, high inflammation). */
    end: number;
    /** Ripple modes; each vanishes on the domain boundary. */
    ripples: { amp: number; kx: number; ky: number }[];
    /** Per-pathway ripple multiplier (aligned to `pathways`): 0 = smooth. */
    ruggedness: number[];
    /** The diagonal walk from start corner to far corner (number of steps). */
    walk: { steps: number };
  };
}

export const CRS: CrsConfig = {
  axis: { min: -1, max: 1, step: 0.1 },

  layer1: {
    drug: "Drug A",
    replicates: [1, 1, 1, -1], // worked example → CRS 0.50
    minReplicates: 2,
    maxReplicates: 8,
    presets: [
      { id: "worked", label: "Worked Example", note: "3 resist, 1 sensitive — CRS +0.50",
        replicates: [1, 1, 1, -1] },
      { id: "agree", label: "Full Agreement", note: "all replicates agree — still CRS +0.50",
        replicates: [0.5, 0.5, 0.5, 0.5] },
      { id: "split", label: "Even Split", note: "replicates diverge — CRS ≈ 0, unpredictable",
        replicates: [1, 1, -1, -1] },
      { id: "sensitive", label: "Predictable Sensitivity", note: "all collaterally sensitive — CRS −0.80",
        replicates: [-0.8, -0.8, -0.8, -0.8] },
    ],
  },

  drugs: ["Drug A", "Drug B", "Drug C", "Drug D", "Drug E", "Drug F"],
  pathways: [
    { id: "p1", label: "Pathway 1", crs: [-0.72, 0.58, -0.45, 0.18, -0.83, 0.40] },
    { id: "p2", label: "Pathway 2", crs: [0.61, -0.70, 0.38, -0.30, 0.69, -0.52] },
  ],

  // Optional hand-tuned distributions (else generated from the drug's CRS).
  // Means are kept consistent with the pathway CRS above so the point estimate
  // sits on the density. Drug A = narrow/confident; Drug D = bimodal/uncertain.
  distributions: {
    "p1:Drug A": { components: [{ weight: 1, mean: -0.72, sd: 0.08 }] },
    "p1:Drug D": { components: [{ weight: 0.68, mean: 0.5, sd: 0.16 }, { weight: 0.32, mean: -0.5, sd: 0.16 }] }, // mean ≈ +0.18, straddles 0
    "p2:Drug A": { components: [{ weight: 1, mean: 0.61, sd: 0.09 }] },
    "p2:Drug D": { components: [{ weight: 0.2, mean: 0.5, sd: 0.16 }, { weight: 0.8, mean: -0.5, sd: 0.16 }] }, // mean ≈ −0.30, straddles 0
  },

  context: {
    axes: [
      { id: "env", label: "Environment", from: "Lab medium", to: "Airway-on-chip" },
      { id: "inflam", label: "Inflammation", from: "Low", to: "High" },
    ],
    example: { drug: "Drug A", baseCrs: -0.7, pull: [0.55, 0.5] },
  },

  // Both pathways run −0.70 (confident sensitivity in lab medium) → 0.00
  // (uncertain, in the inflamed chip). Pathway 1 gets there on a straight ramp;
  // Pathway 2 takes the identical endpoints but a ridged, reversing route.
  layer5: {
    start: -0.7,
    end: 0.0,
    ripples: [
      { amp: 0.30, kx: 2, ky: 1 },
      { amp: 0.22, kx: 1, ky: 3 },
      { amp: 0.18, kx: 3, ky: 2 },
      { amp: 0.13, kx: 3, ky: 3 },
    ],
    ruggedness: [0, 1], // Pathway 1 smooth, Pathway 2 rugged
    walk: { steps: 24 },
  },
};
