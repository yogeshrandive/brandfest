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

const CREATIVITY_SUFFIX = `Do not repeat common stock-photo compositions. Create a fresh, visually distinctive composition suitable for a premium SaaS marketing campaign. Surprise with elegant environmental storytelling while preserving clean, naturally dark negative space in the upper-left corner and lower portion for future branding elements.`;

// ─── Style: Realistic Photo ───────────────────────────────────────────────────

const realisticStyle: StyleDefinition = {
  id: "realistic",
  label: "Realistic",
  icon: "📸",
  description: "Premium Indian lifestyle photography with real people",
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
      "cropped heads at frame edges", "floating objects",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `Premium Indian lifestyle photography. ${sizeNote} ${recipe.style}.

${recipe.environment}. ${recipe.businessCues.length ? `Environmental details include: ${recipe.businessCues.join(", ")}.` : ""}

${recipe.subject}. Maximum two to three people in primary foreground — natural, candid, unposed. Additional people softly in midground or background only.

${recipe.camera}. ${recipe.lighting}.

${recipe.composition} The upper-left corner is naturally uncluttered with a smooth, slightly darker area — free of faces or objects. The lower portion gradually transitions to a darker, smooth, detail-free zone through natural shadow or depth-of-field fade.

Warm honey-gold accents appear naturally in the environment — warm light spill, accent details, decorative elements. Deep navy richness in shadows and depth. Clean white highlights used sparingly.

Atmosphere communicates: ${recipe.mood}. Authentic, warm, and human without any visible text or branding.

Avoid: ${negatives.join(", ")}.

Photorealistic. High dynamic range. Natural materials. Rich textures. Luxury commercial photography.

${CREATIVITY_SUFFIX}`.trim();
  },
};

// ─── Style: Graphical ─────────────────────────────────────────────────────────

const graphicalStyle: StyleDefinition = {
  id: "graphical",
  label: "Graphical",
  icon: "🎨",
  description: "Bold flat design with geometric shapes and brand gradients",
  model: "fal-ai/flux-pro/v1.1",
  negativeAdditions: [
    "realistic photography", "people", "human figures", "faces",
    "3D render", "photorealism", "bokeh", "depth of field",
  ],
  buildPrompt(recipe, size) {
    const sizeNote = size === "story" ? "Vertical 9:16." : "Square 1:1.";
    const negatives = [
      "any text", "letters", "words", "watermarks", "logos", "typography",
      "readable signage", "hex codes", "speech bubbles",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `Modern flat design illustration for a premium SaaS brand. ${sizeNote} Bold graphic artwork with no people or human figures.

Rich gradient background transitioning from deep navy to warm honey-gold. Abstract geometric shapes: clean hexagonal honeycomb pattern inspired by a beehive motif, minimal apartment building silhouettes, floating translucent circles, soft diagonal lines. Premium brand graphic aesthetic.

Composition: upper-right carries graphic elements with visual weight. Upper-left corner deliberately clean and minimal — open space. Lower third naturally smooth and darker with minimal graphic detail — suitable for typography overlay.

Color palette: warm honey-gold as the primary graphic accent, deep navy as background depth, clean white as highlight geometry. Premium gradient transitions. Soft glow effects on key shapes.

Modern corporate graphic design. Adobe Illustrator quality. Premium SaaS brand visual — Apple, Linear, Stripe design language. Minimal. Elegant. No clutter.

Avoid: ${negatives.join(", ")}.

${CREATIVITY_SUFFIX}`.trim();
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

    return `Premium 3D rendered isometric artwork. ${sizeNote} Clay render style with soft rounded edges, warm studio lighting, and rich material textures. No people or human figures.

Miniature isometric residential society scene: small apartment towers with warm lit windows, a miniature landscaped garden with tiny trees and pathways, a society gate entrance, small decorative bee motif detail. Rich warm honey-gold and deep navy tones. Soft clay-like material rendering with gentle shadows.

Composition: main 3D scene in upper-right, diminishing into depth toward lower-left. Upper-left area naturally unoccupied and darker. Lower portion smooth dark gradient below the 3D elements.

Premium soft lighting from upper-left, gentle rim light, clean studio-quality rendering. Soft ambient occlusion shadows. Premium pastel clay tones with honey-gold and navy accents.

Recraft v3. Isometric 3D. Clay render. Premium illustration quality. Miniature architecture. Soft materials.

Avoid: ${negatives.join(", ")}.

${CREATIVITY_SUFFIX}`.trim();
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
      "UI overlays", "dashboards", "extra fingers",
      ...this.negativeAdditions, ...(recipe.negativeExtra ?? []),
    ];

    return `Premium festival decorative photography. ${sizeNote} No people or human figures — pure atmosphere and decoration.

Rich festival arrangement on stone or marble surface: earthen clay diyas with warm amber flame, fresh marigold garlands and loose petals, intricate colorful rangoli pattern, brass oil lamp, scattered rose petals, warm string fairy lights in soft background bokeh. Residential society courtyard or entrance steps as setting — apartment towers dimly visible in deep background.

${recipe.lighting}. Rich warm amber, gold, and saffron tones. Deep moody background with warm glow from diyas and string lights. Premium macro and lifestyle composition.

${recipe.composition} Upper-left area of the frame deliberately clean with darker, cooler tones — free of decorative elements. Lower portion smoothly darker, minimal detail.

Warm honey-gold as the dominant atmospheric tone. Deep navy in background shadows. Rich jewel-toned festival colors: saffron, marigold orange, vermilion, deep red.

Avoid: ${negatives.join(", ")}.

Photorealistic. High dynamic range. Premium lifestyle photography. Rich material textures. Luxury editorial quality.

${CREATIVITY_SUFFIX}`.trim();
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

    return `Premium architectural photography of a modern Indian residential society. ${sizeNote} Focus entirely on space, light, material quality, and architectural beauty. Empty or near-empty environment. One person softly visible in the far background at most — not the focus.

${recipe.environment}. Emphasis on premium materials: marble, glass, polished stone, warm wood, brushed metal. Rich spatial depth. Premium landscaping details. Architectural lines and geometry.

${recipe.camera}. ${recipe.lighting}. Architecture photography aesthetic — Architectural Digest, premium real estate editorial quality.

${recipe.composition} Upper-left corner naturally clean with darker sky or neutral surface — no objects or architectural lines crossing this area. Lower portion smoothly transitions to dark — no foreground objects, just clean surface or ground gradient.

Warm honey-gold appears in warm window light, golden stone, accent lighting. Deep navy in evening sky or deep shadow areas. Clean white in premium surfaces and architectural highlights.

Atmosphere communicates: ${recipe.mood}. Premium, organized, aspirational. No visible text or branding.

Avoid: ${negatives.join(", ")}.

Photorealistic. High dynamic range. Premium architectural photography. Rich material textures. Luxury commercial quality.

${CREATIVITY_SUFFIX}`.trim();
  },
};

// ─── Style registry ───────────────────────────────────────────────────────────

export const STYLE_DEFINITIONS: Record<CreativeStyle, StyleDefinition> = {
  "realistic": realisticStyle,
  "graphical": graphicalStyle,
  "abstract-3d": abstract3dStyle,
  "festival-decor": festivalDecorStyle,
  "architectural": architecturalStyle,
};

// Default style per scene category
export const SCENE_DEFAULT_STYLE: Record<string, CreativeStyle> = {
  "festival-greeting": "realistic",
  "society-garden": "realistic",
  "clubhouse": "realistic",
  "offer-campaign": "graphical",
  "society-office": "realistic",
  "apartment-lobby": "architectural",
  "agm-hall": "realistic",
  "building-entrance": "architectural",
};

export function getDefaultStyle(sceneId: string): CreativeStyle {
  return SCENE_DEFAULT_STYLE[sceneId] ?? "realistic";
}
