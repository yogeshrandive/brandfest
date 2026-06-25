// ─── Variation Engines ────────────────────────────────────────────────────────
// Each engine has a named library and a seeded pick function.
// Pass a seed string (e.g. sceneId + date) for deterministic but varied results.

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

// ─── Scene library ────────────────────────────────────────────────────────────

export const SCENE_ENVIRONMENTS = {
  "society-garden": [
    "Lush landscaped society garden, manicured grass, stone pathways, decorative flowering plants, premium outdoor furniture, apartment towers soft in background",
    "Sunlit community garden, wooden pergola with climbing plants, residents relaxing on benches, water feature, modern residential towers visible",
    "Serene society green, morning light through trees, children's play area edge, premium landscaping, glass apartment facade in distance",
  ],
  "apartment-lobby": [
    "Modern marble-floored apartment lobby, tall ceiling, pendant lighting, tasteful indoor plants, polished reception desk, elevator doors in background",
    "Premium residential entrance hall, warm amber lighting, stone-cladded walls, contemporary art piece, well-dressed doorman in soft background",
    "Luxury apartment atrium, double-height ceiling, natural light from skylights, minimalist furniture, residential tower corridor beyond",
  ],
  "society-office": [
    "Modern society management office, warm wood furniture, printed ledgers neatly stacked, large window overlooking residential complex, warm ambient light",
    "Well-organized committee room, polished conference table, printed financial registers, framed society notice board, natural window light",
    "Contemporary housing society administrative office, potted plants, neatly arranged files, neutral walls, soft morning light through blinds",
  ],
  "building-entrance": [
    "Premium apartment complex entrance, decorative gate with intercom panel, stone paving, manicured hedges lining pathway, warm evening lighting",
    "Modern residential society gate, security cabin with warm interior light, evening sky, clean architectural facade, lit pathway",
    "Elegant apartment entrance archway, visitor area with soft lighting, contemporary design, well-maintained grounds, dusk sky",
  ],
  "agm-hall": [
    "Community meeting hall, rows of cushioned chairs, warm wooden panelling, soft overhead lighting, small stage area, banner on back wall",
    "Society AGM room, large oval table with printed agendas, committee members softly visible in background, professional atmosphere",
    "Modern clubhouse meeting room, contemporary furniture, projection area (blank), tall windows with natural light, organized formal setup",
  ],
  "clubhouse": [
    "Spacious residential clubhouse interior, contemporary furniture, warm ambient lighting, large windows, community banners visible",
    "Modern society clubhouse lounge, comfortable seating arrangement, tasteful decor, open plan interior, glass walls overlooking garden",
    "Premium clubhouse hall, warm lighting, potted plants, open social space, residential community banners in background",
  ],
  "festival-courtyard": [
    "Society courtyard decorated with warm festival string lights, lanterns, marigold garlands, stone-paved open space, apartment towers lit in background",
    "Festive community courtyard, colorful rangoli on ground, string lights overhead, evening warm glow, elegant residential backdrop",
    "Open society plaza decorated for festival, warm amber lighting, cultural decorations, premium landscaping, modern towers in background",
  ],
  "rooftop": [
    "Modern apartment rooftop terrace, city skyline at golden hour, contemporary seating, warm ambient lighting, residential towers in background",
    "Premium rooftop community space, evening sky, comfortable outdoor furniture, city lights beginning to appear, plants in planters",
    "Society rooftop garden, dusk sky, urban residential skyline, well-designed terrace, soft warm lighting from hidden fixtures",
  ],
  "abstract": [
    "Abstract premium architectural detail, glass and steel, natural light reflections, clean geometric lines, warm gold accent elements",
    "Minimalist architectural photography, neutral tones, soft shadows, premium material textures, clean negative space dominant",
    "Contemporary interior abstract, warm light through frosted glass, premium surface textures, minimal and elegant",
  ],
};

export type SceneEnvironmentKey = keyof typeof SCENE_ENVIRONMENTS;

export function pickSceneEnvironment(key: SceneEnvironmentKey, seed: string): string {
  const options = SCENE_ENVIRONMENTS[key] ?? SCENE_ENVIRONMENTS["abstract"];
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
