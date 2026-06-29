import type { CreativeStyle } from "./types";
import type { CreativeRecipe } from "./types";

// ─── Style definitions ────────────────────────────────────────────────────────

export interface StyleDefinition {
  id: CreativeStyle;
  label: string;
  icon: string;
  description: string;
  // FAL model to use for this style
  model: string;
  // Appended to every negative list
  negativeAdditions: string[];
  // Builds the full FAL prompt prose from a recipe
  buildPrompt: (recipe: CreativeRecipe, size: "square" | "story") => string;
}

// ─── CRITICAL composition rule injected into every prompt ────────────────────
// The bottom 30-35% of the final image is covered by a post-production text
// overlay (headline + CTA). FAL must not place any hero content there.

function compositionGuard(size: "square" | "story"): string {
  const pct = size === "story" ? "35%" : "30%";
  return `CRITICAL COMPOSITION RULE — the bottom ${pct} of this image will be covered by a post-production text overlay applied in design software. Place ALL hero subjects, faces, key objects, and focal points in the UPPER ${size === "story" ? "55%" : "60%"} of the frame. The lower ${pct} must be naturally clear: a smooth surface, clean floor, soft out-of-focus background, a plain wall, or a gentle tonal fade — no faces, no primary subjects, no important details. The top-left corner must stay unobstructed for a small logo badge.`;
}

// ─── Style: Realistic Photo ───────────────────────────────────────────────────

const realisticStyle: StyleDefinition = {
  id: "realistic",
  label: "Realistic",
  icon: "📸",
  description: "Premium lifestyle photography with real people",
  model: "fal-ai/flux-pro/v1.1-ultra",
  negativeAdditions: ["illustration", "3D render", "flat design", "cartoon", "vector art"],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16 portrait format." : "Square 1:1 format.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos", "readable signage",
      "UI overlays", "dashboards", "software screens", "hex codes",
      "more than three people in primary foreground", "crowded scenes",
      "staged poses", "direct camera stares", "exaggerated expressions",
      "extra fingers", "distorted anatomy", "blurry faces", "malformed hands",
      "cropped heads at frame edges", "floating objects", "visual clutter in lower frame",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `${sizeNote} Premium lifestyle brand photography, editorial quality. ${recipe.style}.

${recipe.environment}. ${recipe.businessCues.length ? `Key environmental details: ${recipe.businessCues.join(", ")}.` : ""}

${recipe.subject}. One to three people maximum in the primary foreground — candid, authentic, never posed. Natural micro-expressions, genuine body language, caught mid-action. Rich environmental storytelling through material texture and ambient detail.

${recipe.camera}. ${recipe.lighting}. High dynamic range, tactile surface detail, cinematic color grading. Warm accent tones appear naturally in the setting. Rich shadow depth with clean highlight contrast.

Mood: ${recipe.mood}.

${compositionGuard(size)}

${negatives.length ? `Avoid: ${negatives.join(", ")}.` : ""}

Photorealistic. Commercial advertising grade. Rich textures, natural materials, luxury editorial photography quality. Fresh original composition — not a stock photo cliché.`.trim();
  },
};

// ─── Style: Indian Lifestyle ──────────────────────────────────────────────────

const lifestyleStyle: StyleDefinition = {
  id: "lifestyle",
  label: "Indian Lifestyle",
  icon: "👨‍👩‍👧",
  description: "Candid Indian families and community moments — warm, authentic, joyful",
  model: "fal-ai/flux-pro/v1.1-ultra",
  negativeAdditions: ["illustration", "3D render", "flat design", "cartoon", "stock photo poses"],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16 portrait format." : "Square 1:1 format.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos", "readable signage",
      "UI overlays", "dashboards", "hex codes",
      "more than four people in primary foreground", "overly crowded scenes",
      "direct camera stares", "staged studio poses", "exaggerated expressions",
      "extra fingers", "distorted anatomy", "blurry faces", "malformed hands",
      "cropped heads at frame edges", "floating objects", "visual clutter in lower frame",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `${sizeNote} Bold commercial lifestyle photography featuring real Indian people — beautiful, confident, aspirational. The image has the visual punch of a high-end Indian magazine advertisement.

${recipe.environment}. ${recipe.businessCues.length ? `Scene context: ${recipe.businessCues.join(", ")}.` : ""}

${recipe.subject}. Real Indian faces — expressive, confident, authentic. Two to three people in foreground: a mix of ages, modern Indian attire, caught in a genuine living moment — not posed. Movement, energy, warmth. Faces lit beautifully with dramatic yet natural light. Eyes bright, skin rich and luminous.

${recipe.camera}. ${recipe.lighting}. Deep saturated color grading: warm honey-gold afternoon light, rich jewel-tone clothing, vibrant environmental color. Skin tones rendered warm and flattering. Backgrounds with depth — soft bokeh on mid and far elements, sharp crisp foreground.

Mood: ${recipe.mood}.

${compositionGuard(size)}

${negatives.length ? `Avoid: ${negatives.join(", ")}.` : ""}

Photorealistic. High dynamic range. Bold color. Premium Indian lifestyle editorial — the visual energy of Vogue India, Femina, or a top Bollywood brand campaign. Rich human warmth, no text, no branding.`.trim();
  },
};

// ─── Style: Graphical ─────────────────────────────────────────────────────────

const graphicalStyle: StyleDefinition = {
  id: "graphical",
  label: "Graphical",
  icon: "🎨",
  description: "Bold flat illustration with vibrant shapes and strong graphic design",
  model: "fal-ai/flux-pro/v1.1",
  negativeAdditions: [
    "realistic photography", "people", "human figures", "faces",
    "3D render", "photorealism", "bokeh", "depth of field",
  ],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16." : "Square 1:1.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos", "typography",
      "readable signage", "hex codes", "speech bubbles", "UI elements",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `${sizeNote} Striking bold vector illustration — the visual impact of a premium advertising poster. Flat design with maximum graphic punch. No people.

${recipe.environment}. ${recipe.businessCues.length ? `Illustrated elements: ${recipe.businessCues.join(", ")}.` : ""} ${recipe.subject}.

Composition built like a commercial advertisement background: the upper two-thirds carries all the graphic weight — bold illustrated motifs, strong geometric shapes, dynamic diagonal energy, vibrant layered elements at large scale. The graphic elements are specific to this business type: ${recipe.mood}.

Strong contrasting color palette with bold fills, crisp outlines, geometric precision. Vivid gradient washes behind flat shapes. Accent color pops — high saturation, purposeful contrast, graphic confidence. Think Saul Bass meets modern brand design. Negative space used intentionally for visual breathing room.

${compositionGuard(size)}

${negatives.length ? `Avoid: ${negatives.join(", ")}.` : ""}

Flat vector illustration. Premium graphic design quality — Adobe Illustrator / Behance top shot. Bold, fresh, commercial, distinctive. Not generic clip art.`.trim();
  },
};

// ─── Style: Abstract 3D ───────────────────────────────────────────────────────

const abstract3dStyle: StyleDefinition = {
  id: "abstract-3d",
  label: "Abstract 3D",
  icon: "✨",
  description: "Premium 3D rendered isometric or clay-style artwork",
  model: "fal-ai/recraft-v3",
  negativeAdditions: [
    "people", "human figures", "faces", "realistic photography",
    "flat design", "2D illustration",
  ],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16 format." : "Square 1:1 format.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos",
      "readable interfaces", "hex codes", "people", "human figures",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `${sizeNote} Premium 3D rendered isometric scene — clay render aesthetic with soft rounded forms, studio-quality lighting, and rich material detail. No people.

${recipe.environment}. ${recipe.businessCues.length ? `Scene includes miniature 3D versions of: ${recipe.businessCues.join(", ")}.` : ""} ${recipe.subject}. Craft a detailed miniature world specific to this business, viewed from an elegant isometric angle. Objects feel tactile and inviting — smooth matte clay surfaces, subtle ambient occlusion shadows, warm studio fill light.

Composition: the main 3D scene occupies the upper portion of the frame with visual richness — multiple layered elements at different depths. The scene recedes into clean open space in the lower portion.

Warm soft lighting from above-left, gentle rim highlights, clean pastel accent tones. Rich material rendering: fabric, ceramic, metal, plant life each rendered distinctly. Depth created through overlapping isometric layers.

Mood: ${recipe.mood}.

${compositionGuard(size)}

${negatives.length ? `Avoid: ${negatives.join(", ")}.` : ""}

Recraft v3 isometric 3D. Clay render. Premium illustration quality. Soft materials, warm light, rich scene detail.`.trim();
  },
};

// ─── Style: Festival Decor ────────────────────────────────────────────────────

const festivalDecorStyle: StyleDefinition = {
  id: "festival-decor",
  label: "Decorative",
  icon: "🪔",
  description: "Rich festival atmosphere — diyas, rangoli, marigolds, string lights",
  model: "fal-ai/flux-pro/v1.1-ultra",
  negativeAdditions: [
    "people", "human figures", "faces", "illustration", "3D render", "cartoon",
  ],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16 portrait format." : "Square 1:1 format.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos", "readable signage",
      "hex codes", "people", "human figures", "faces",
      "UI overlays", "dashboards",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `${sizeNote} Exquisitely styled festive flat-lay — the art direction of a luxury brand Diwali campaign or a high-end Indian wedding invitation. No people, no text.

${recipe.environment}. ${recipe.businessCues.length ? `Feature: ${recipe.businessCues.join(", ")}.` : ""} ${recipe.subject}. Arrange richly detailed festive decorative elements — glowing clay diyas, fresh marigold garlands, scattered rose petals, sparkling gold accents, intricate rangoli fragments, ornate metalwork — in an elegant asymmetric composition.

Decorations cluster densely and richly in the CORNERS and along ONE SIDE of the frame — top-right and bottom-left quadrants carry the decorative weight. The remaining two-thirds of the image — the center and most of the vertical space — is left deliberately clean, smooth, and open. A unified warm dark background (deep jewel tone or rich black) unifies the composition.

${recipe.lighting}. Warm glowing light from the diyas creates a golden halo effect. Rich saturated festive palette: deep saffron, jewel green, crimson red, burnished gold. Photorealistic detail — every petal, every flame, every texture rendered beautifully.

${compositionGuard(size)}

${negatives.length ? `Avoid: ${negatives.join(", ")}.` : ""}

Luxury festive photography. Rich jewel tones. Warm golden glow. Immaculate art direction. Premium greeting card quality — not generic clip art.`.trim();
  },
};

// ─── Style: Architectural ─────────────────────────────────────────────────────

const architecturalStyle: StyleDefinition = {
  id: "architectural",
  label: "Architectural",
  icon: "🏛️",
  description: "Architectural photography — space, buildings, environment — minimal people",
  model: "fal-ai/flux-pro/v1.1-ultra",
  negativeAdditions: [
    "crowded scenes", "multiple people", "groups of people", "illustration", "3D render",
  ],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16 portrait format." : "Square 1:1 format.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos", "readable signage",
      "UI overlays", "dashboards", "hex codes", "multiple people", "crowds",
      "extra fingers", "distorted anatomy", "blurry faces",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `${sizeNote} Stunning architectural photography — the visual authority of Architectural Digest or a luxury real-estate campaign. Empty or near-empty environment; space itself is the hero.

${recipe.environment}. Premium materials take center stage: polished marble, tempered glass, brushed brass, warm timber, architectural concrete. Every surface tells a story of quality. Rich spatial depth — foreground material detail recedes into a well-composed mid-ground and atmospheric background.

${recipe.camera}. ${recipe.lighting}. Architecture editorial quality — perfect geometries, deliberate sight lines, beautiful tonal control. Warm accent light glows from within the space; cool ambient light creates depth.

Mood: ${recipe.mood}. Premium, aspirational, immaculate.

${compositionGuard(size)}

${negatives.length ? `Avoid: ${negatives.join(", ")}.` : ""}

Photorealistic. High dynamic range. Premium architectural photography. Commercial real-estate or hospitality advertising quality.`.trim();
  },
};

// ─── Style registry ───────────────────────────────────────────────────────────

export const STYLE_DEFINITIONS: Record<CreativeStyle, StyleDefinition> = {
  "realistic": realisticStyle,
  "lifestyle": lifestyleStyle,
  "graphical": graphicalStyle,
  "abstract-3d": abstract3dStyle,
  "festival-decor": festivalDecorStyle,
  "architectural": architecturalStyle,
};

// Default style per scene category
export const SCENE_DEFAULT_STYLE: Record<string, CreativeStyle> = {
  "festival-greeting": "lifestyle",
  "society-garden": "lifestyle",
  "clubhouse": "lifestyle",
  "offer-campaign": "graphical",
  "society-office": "realistic",
  "apartment-lobby": "architectural",
  "agm-hall": "realistic",
  "building-entrance": "architectural",
};

export function getDefaultStyle(sceneId: string): CreativeStyle {
  return SCENE_DEFAULT_STYLE[sceneId] ?? "realistic";
}
