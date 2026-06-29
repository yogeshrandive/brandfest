import { callLLM } from "./llmAdapter";
import type {
  BrandConfig,
  Subcategory,
  Industry,
  ContentMoment,
  ImageStyle,
  SceneInputValues,
  PosterSize,
  CreativeBrief,
} from "./types";

const SYSTEM_PROMPT = `You are an Art Director for a small-business marketing studio. You brief BACKGROUND ART ONLY for a single creative — a greeting post or an offer post — for any kind of small business.

Your job is NOT to write the final image prompt and NOT to put any text in the image.
Your job is to invent ONE specific, fresh creative idea for THIS business and return it as a structured Creative Brief in JSON.

Critical rules:
- No text, letters, words, logos, UI, screens, or watermarks appear in the artwork. Headline, logo and contact footer are composited on top afterwards.
- You MUST reserve clean empty space for them: a smooth area for the logo, and a smooth darker area for the headline/CTA. Plan where these go and describe it precisely.
- Use VISUAL NOUNS, not stories. scene = environment/materials/atmosphere. subject = camera focus (what/who, position, natural action).
- Make it SPECIFIC to this business type using the provided scene material (environments, props). Avoid generic stock clichés.
- For a "real-human" image style: real people and photographic realism are welcome. For a "vector" image style: NO people/photos — use clean flat illustration, geometric shapes, and the provided motifs. For a "festive-decor" image style: NO people — design a decorative greeting card; describe an arrangement of occasion-specific decorative motifs (lamps, flowers, petals, ornaments, sparkles) framing the edges/corners while keeping a large clean central area open for the message. Set scene/subject to describe these decorations, not a room.
- logoSpec: choose a corner that stays visually clean; widthPct is logo width as % of image width (use 22-30).
- typographySafeZone: an area with no faces/bright detail that supports white type.

Return ONLY valid JSON with this exact structure:
{
  "goal": "one sentence — what this background artwork must communicate visually",
  "mood": "2-3 precise mood words",
  "scene": "environment noun phrases — location, materials, atmosphere — no full sentences",
  "subject": "camera/illustration focus — what, position, natural action — visual and specific",
  "lighting": "lighting direction, quality, color temperature (or 'flat even illustration light' for vector)",
  "composition": "visual weight — where the subject sits, foreground/background layers, which quadrants stay empty",
  "reservedAreas": [
    { "position": "bottom", "percentage": 32, "purpose": "headline and CTA text overlay" },
    { "position": "top-left", "percentage": 8, "purpose": "logo placement" }
  ],
  "backgroundStyle": "3-5 word visual style descriptor",
  "backgroundQuality": "lighting quality, textures, finish — noun phrases",
  "visualKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "colorDirective": "where brand colors appear naturally in the scene",
  "negativeElements": ["thing AI commonly gets wrong here 1", "2", "3"],
  "emotions": ["Emotion1", "Emotion2", "Emotion3"],
  "cameraDirection": "lens mm, angle, framing, depth of field (or composition style for vector)",
  "brandPlacement": "exact position and size for logo over a clean area",
  "typographySafeZone": "exact area — smooth, no faces, supports white typography",
  "businessRelevanceCues": ["business-specific prop/detail 1", "2", "3"],
  "designIntent": ["Trait1", "Trait2", "Trait3", "Trait4", "Trait5"],
  "visualHierarchy": ["Primary: ...", "Secondary: ...", "Third: ...", "Fourth: ..."],
  "logoSpec": { "position": "top-left", "widthPct": 26 }
}`;

function brandLabel(brand: BrandConfig | undefined): string {
  if (!brand?.name) return "(no brand details yet — keep it generic but on-category)";
  return [
    `Business: ${brand.name}`,
    brand.tagline ? `Tagline: ${brand.tagline}` : "",
    brand.brandStyle ? `Brand Style: ${brand.brandStyle}` : "",
    brand.brandVoice ? `Voice: ${brand.brandVoice}` : "",
    brand.colors ? `Colors: primary ${brand.colors.primary}, secondary ${brand.colors.secondary}, accent ${brand.colors.accent}` : "",
  ].filter(Boolean).join("\n");
}

export interface CreativeDirectorOpts {
  brand?: BrandConfig;
  industry: Industry;
  subcategory: Subcategory;
  moment: ContentMoment;
  inputs: SceneInputValues;
  size: PosterSize;
  imageStyle: ImageStyle;
  model?: string;
}

export async function callCreativeDirector(opts: CreativeDirectorOpts): Promise<CreativeBrief> {
  const { brand, industry, subcategory, moment, inputs, size, imageStyle, model } = opts;

  const isStory = size === "story";
  const aspectNote = isStory
    ? "Vertical 9:16. Hero fills upper ~60%. Bottom ~35% smooth and clean for text. One top corner clear for logo."
    : "Square 1:1. Bottom ~30% smooth and clean for text. Subject center or one-side weighted. One top corner clear for logo.";

  const campaignBlock = Object.entries(inputs)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const userMessage = `
BUSINESS
Industry: ${industry.name} — ${industry.description}
Subcategory: ${subcategory.name} — ${subcategory.description}
${brandLabel(brand)}

SCENE MATERIAL (use these, pick/combine — do not list them literally)
Environments: ${subcategory.sceneEnvironments.join(" | ")}
Props: ${subcategory.props.join(", ")}
Moods: ${subcategory.moods.join(", ")}
Vector motifs (only if vector style): ${subcategory.vectorMotifs.join(", ")}

CONTENT MOMENT
Type: ${moment === "greeting" ? "Greeting / festive wish" : "Offer / promotion"}
${campaignBlock || "(no specific details — invent a fitting idea)"}

IMAGE STYLE
${
  imageStyle === "vector"
    ? "vector — flat illustration, no people, no photos; clean shapes and motifs"
    : imageStyle === "festive-decor"
      ? "festive-decor — a decorative greeting-card design, no people; an arrangement of festive/occasion motifs (lamps, flowers, petals, ornaments, sparkles) framing the edges, with a LARGE clean uncluttered area kept open for the greeting message"
      : "real-human — photographic realism, real people welcome"
}

FORMAT & LAYOUT
${aspectNote}

Generate the Creative Brief JSON now.
`.trim();

  const raw = await callLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { model, temperature: 0.8, max_tokens: 1200 }
  );

  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(json) as CreativeBrief;
}

// Fallback brief when OPENROUTER_API_KEY is not set or a model fails.
export function buildFallbackBrief(opts: {
  industry: Industry;
  subcategory: Subcategory;
  moment: ContentMoment;
  inputs: SceneInputValues;
  brand?: BrandConfig;
  size: PosterSize;
  imageStyle: ImageStyle;
}): CreativeBrief {
  const { subcategory, moment, brand, size, imageStyle } = opts;
  const isStory = size === "story";
  const isVector = imageStyle === "vector";
  const bottomPct = isStory ? 35 : 30;
  const env = subcategory.sceneEnvironments[0] ?? "clean modern business setting";
  const mood = subcategory.moods.slice(0, 3).join(" ") || "warm premium fresh";
  const primary = brand?.colors?.primary ?? "#F5B301";
  const secondary = brand?.colors?.secondary ?? "#1A1A2E";

  return {
    goal: moment === "greeting"
      ? `Premium ${isVector ? "illustrated" : "photographic"} background for a ${subcategory.name} greeting — communicate warmth and celebration through scene alone`
      : `Premium ${isVector ? "illustrated" : "photographic"} background for a ${subcategory.name} offer — communicate value and appeal through scene alone`,
    mood,
    scene: isVector
      ? `Flat illustrated composition inspired by ${subcategory.name}, geometric shapes and motifs (${subcategory.vectorMotifs.slice(0, 3).join(", ")}), clean negative space`
      : env,
    subject: isVector
      ? `Stylised central motif (${subcategory.vectorMotifs[0] ?? "brand emblem"}), balanced with supporting shapes, no people`
      : `Hero focus on ${subcategory.props[0] ?? "the main product"}, natural and inviting, right-of-center`,
    lighting: isVector ? "Flat even illustration light, soft gradients" : "Warm natural light, soft directional, gentle depth of field",
    composition: isStory
      ? `Hero fills upper 60%, bottom ${bottomPct}% smooth and clean for text, one top corner clear`
      : `Subject center/right, bottom ${bottomPct}% smooth and clean for text, top-left clear`,
    reservedAreas: [
      { position: "bottom", percentage: bottomPct, purpose: "headline and CTA text overlay" },
      { position: "top-left", percentage: 8, purpose: "logo placement" },
    ],
    backgroundStyle: isVector ? "Modern flat vector illustration" : "Photorealistic premium lifestyle",
    backgroundQuality: isVector
      ? "Clean shapes, smooth gradients, premium flat aesthetic"
      : "Warm natural light, rich textures, soft depth of field",
    visualKeywords: [subcategory.name, ...subcategory.moods.slice(0, 2), ...subcategory.props.slice(0, 2)],
    colorDirective: `${primary} appears as the accent; ${secondary} grounds shadows/depth. Bottom zone graduates darker for text readability.`,
    negativeElements: isVector
      ? ["photographic textures", "realistic people", "3D render", "clutter"]
      : ["text", "logos", "UI screens", "posed stock photography", "clutter"],
    emotions: subcategory.moods.slice(0, 3).map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
    cameraDirection: isVector ? "Balanced flat composition, centered emblem, generous margins" : "Eye-level, 35mm, f/2.8 natural depth of field",
    brandPlacement: "Logo top-left, ~26% image width, clear margin over a clean area",
    typographySafeZone: `Bottom ${bottomPct}% — smooth, no faces/bright detail, supports white typography`,
    businessRelevanceCues: subcategory.props.slice(0, 3),
    designIntent: ["Premium", "On-brand", "Fresh", "Inviting", "Clear"],
    visualHierarchy: [
      "Primary: hero subject/motif",
      "Secondary: supporting scene/props",
      "Third: background atmosphere",
      "Fourth: reserved clean space",
    ],
    logoSpec: { position: "top-left", widthPct: 26 },
  };
}
