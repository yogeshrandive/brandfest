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

const SYSTEM_PROMPT = `You are a Senior Art Director at a top Indian advertising agency (think Ogilvy Mumbai, McCann India). You create background artwork briefs for BOLD COMMERCIAL ADVERTISING POSTERS — not generic stock images. Your clients are small-business owners and the output competes with the best Indian print advertising.

Your job is to invent ONE specific, strikingly creative visual idea for THIS exact business, then describe it with the precision a professional photographer or illustrator needs. Return it as a structured Creative Brief in JSON.

WHAT YOU ARE BRIEFING:
- Background art ONLY — no text, letters, words, logos, or branding in the artwork itself. Headlines and logos are composited on top in post-production.
- The bottom 30-35% of the image will be COVERED by a title + footer overlay. The image generator must NOT place any important content there. Describe this constraint explicitly in composition and subject placement.
- The top-left corner must stay clean for a logo badge.

CREATIVE STANDARDS:
- Think like the best ad you've ever seen for this business category. Be specific, be bold, be unexpected. No generic "person smiling in a shop" clichés.
- For photographic styles: think Vogue India covers, Kingfisher calendar energy, premium brand campaign. Real faces, dramatic light, rich environments. One strong hero moment.
- For vector/illustration: think Behance award-winning poster design. Bold motifs at large scale, strong graphic contrast, commercial punch.
- For festive-decor: think luxury brand Diwali campaign — Tanishq, Manyavar, Fabindia aesthetic. Rich decorative arrangement, jewel tones, immaculate styling.
- SPECIFIC over GENERIC: name the exact prop, the exact light quality, the exact camera angle, the exact emotion on the face.
- COMPOSITION: All hero content (faces, key objects, focal point) must live in the UPPER 60-65% of the frame. The lower 30-35% must be naturally clear — smooth floor, soft bokeh fade, clean gradient, or plain surface. Describe this explicitly in the composition field.
- Use VISUAL NOUNS: scene = environment + materials + atmosphere (no full sentences). subject = precise camera focus — who, exact position, exact natural action.
- For "real-human": real people welcome, dramatic and authentic. For "vector": NO people — flat illustration, large bold motifs, strong graphic shapes. For "festive-decor": NO people — decorative elements clustered in corners/edges, large open center-bottom area kept clear.
- logoSpec: pick a corner that stays visually clean; widthPct = 22-30.
- typographySafeZone: must be the lower 30-35% — smooth, no faces, no bright detail, supports white text overlay.

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
