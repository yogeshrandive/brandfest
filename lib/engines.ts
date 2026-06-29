// ─── Variation Engines ────────────────────────────────────────────────────────
// Each engine has a named library and a seeded pick function.
// Pass a seed string (e.g. sceneId + date) for deterministic but varied results.

export function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

// Pick a scene environment from a business subcategory's library (industry-agnostic).
export function pickFrom(options: string[] | undefined, seed: string, fallback = ""): string {
  if (!options || options.length === 0) return fallback;
  return pick(options, seed);
}

// ─── Style engine ─────────────────────────────────────────────────────────────

export const STYLES = [
  "premium lifestyle photography, editorial quality, soft color grading",
  "luxury architectural photography, minimal, high contrast, clean shadows",
  "modern corporate editorial, warm tones, natural depth of field",
  "premium Indian lifestyle photography, warm golden palette, cinematic",
  "contemporary SaaS brand photography, clean backgrounds, minimal clutter",
  "architectural interior photography, natural window light, premium materials",
];

export function pickStyle(seed: string): string {
  return pick(STYLES, seed + "style");
}

// ─── Camera engine ────────────────────────────────────────────────────────────

export const CAMERAS = [
  "35mm lens, eye-level, f/2.0 natural bokeh, wide balanced composition",
  "50mm portrait lens, slight elevation, f/1.8 background separation, subject right-of-center",
  "24mm wide lens, eye-level, environmental depth, foreground texture in corner",
  "35mm, slightly elevated three-quarter angle, open airy composition",
  "50mm, eye-level candid framing, natural depth of field, relaxed atmosphere",
  "28mm wide, low angle, architectural emphasis, people in natural midground",
];

export function pickCamera(seed: string): string {
  return pick(CAMERAS, seed + "cam");
}

// ─── Lighting engine ──────────────────────────────────────────────────────────

export const LIGHTINGS = [
  "warm golden hour sunlight from right, soft shadows, rich warm tones",
  "soft morning light through large windows, clean neutral whites, natural shadows",
  "warm indoor ambient lighting, pendant and recessed, premium interior feel",
  "diffused cloudy daylight, even soft illumination, clean and airy",
  "festival warm glow, string lights and lanterns, amber and gold tones, evening",
  "blue hour exterior, deep blue sky, warm interior lights glowing, dusk atmosphere",
  "natural window light from left, soft directional, slight warmth, lifestyle feel",
  "golden afternoon indoor light, warm shadows, rich material textures",
];

export function pickLighting(seed: string): string {
  return pick(LIGHTINGS, seed + "light");
}

// ─── Composition engine ───────────────────────────────────────────────────────

export const COMPOSITIONS: Record<"square" | "story", string[]> = {
  square: [
    "Subject fills right two-thirds, left side naturally open and lighter. Lower quarter fades gradually to dark.",
    "Central composition, subject prominent in upper-center, foreground texture at bottom edge, natural gradient to dark below.",
    "Rule of thirds, primary subject upper-right, environment fills left half, lower third naturally uncluttered.",
    "Subject right-center, strong architectural element left, lower portion smooth and darker.",
    "Environmental wide shot, small figures in midground, expansive space, lower area naturally open and clean.",
  ],
  story: [
    "Subject fills upper 55% of frame, centered. Lower 35% fades naturally to dark with minimal detail.",
    "Subject upper-right, architectural context left, environment fills upper two-thirds, lower third smooth gradient.",
    "Vertical portrait composition, subject at golden ratio point from top, below naturally open and uncluttered.",
    "Upper half scene-rich with subject and environment, lower half clean natural gradient towards dark.",
    "Wide vertical shot, subject at eye level upper-center, depth of environment above, lower area deliberately minimal.",
  ],
};

export function pickComposition(size: "square" | "story", seed: string): string {
  return pick(COMPOSITIONS[size], seed + "comp");
}
