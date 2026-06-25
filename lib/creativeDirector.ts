import { callLLM } from "./llmAdapter";
import type { BrandConfig, SceneDefinition, SceneInputValues, PosterSize, CreativeBrief } from "./types";

const SYSTEM_PROMPT = `You are an experienced Creative Director at a global advertising agency specialising in Indian B2B SaaS brands.

Your job is NOT to write an image prompt.

Your job is to analyse the business, the campaign, and the scene — then return a structured Creative Brief as JSON.

The Creative Brief will be handed to a Prompt Engineer who converts it into an image generation prompt. You never write that prompt. You only write the brief.

Think like this:
- What is the GOAL of this creative? (generate leads, build trust, celebrate occasion, announce offer)
- What MOOD fits this brand and campaign?
- What SCENE feels authentic to this industry and target audience?
- What is the MAIN SUBJECT of the image?
- What LIGHTING and COMPOSITION serve the goal?
- What areas must stay EMPTY for text overlays?
- What visual KEYWORDS are specific to this brand — not generic stock photo words?

Rules:
- Never use generic words like "professional" or "business" alone — always be specific and cinematic
- Settings must be real, recognisable places relevant to the industry
- People must match the actual target audience, not stock photo models
- Reserved areas are CRITICAL — the text overlay engine depends on them
- visualKeywords must be specific to THIS industry, not generic SaaS marketing
- negativeElements must prevent common AI image mistakes for this scene type

Return ONLY valid JSON matching this exact structure:
{
  "goal": "one sentence — what this creative must achieve",
  "mood": "2-3 mood words (e.g. Warm Celebratory Premium)",
  "scene": "specific cinematic scene description — real location, real atmosphere, 2 sentences",
  "subject": "main visual focus — what the eye goes to first, 1-2 sentences",
  "lighting": "specific lighting direction and quality",
  "composition": "layout — where the main subject sits, depth, framing",
  "reservedAreas": [
    { "position": "bottom", "percentage": 30, "purpose": "headline and CTA text overlay" },
    { "position": "top-left", "percentage": 8, "purpose": "logo placement" }
  ],
  "backgroundStyle": "overall visual style in 3-5 words",
  "visualKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "colorDirective": "how to use the brand colors in this scene",
  "negativeElements": ["element to avoid 1", "element to avoid 2", "element to avoid 3"]
}`;

export async function callCreativeDirector(opts: {
  scene: SceneDefinition;
  inputs: SceneInputValues;
  brand: BrandConfig;
  size: PosterSize;
  visualStyle?: string;
}): Promise<CreativeBrief> {
  const { scene, inputs, brand, size, visualStyle } = opts;

  const isStory = size === "story";
  const aspectNote = isStory
    ? "Vertical portrait (9:16). The main subject should occupy the upper 60%. Bottom 35% must be kept dark and empty for text overlay."
    : "Square (1:1). Bottom 30% must be kept dark and empty for text overlay. Main subject centered or right-aligned.";

  const dna = (brand as unknown as Record<string, unknown>).brandVisualDNA as {
    colorNames?: { primary?: string; secondary?: string };
    patterns?: string[];
    settings?: string[];
    people?: string[];
    products?: string[];
  } | undefined;

  const brandBlock = `
Business: ${brand.name}
Industry: ${brand.subCategory || brand.industry}
Description: ${brand.businessDescription ?? ""}
Brand Style: ${brand.brandStyle ?? "Premium"}, ${brand.brandVoice ?? "Professional"}
Target Audience: ${Array.isArray(brand.targetAudience) ? brand.targetAudience.join("; ") : brand.targetAudience ?? ""}
Primary Color: ${brand.colors.primary}${dna?.colorNames?.primary ? ` (${dna.colorNames.primary})` : ""}
Secondary Color: ${brand.colors.secondary}${dna?.colorNames?.secondary ? ` (${dna.colorNames.secondary})` : ""}
Accent Color: ${brand.colors.accent}
Brand Summary: ${(brand as unknown as Record<string, string>).brandSummary ?? ""}
Visual DNA — Settings: ${dna?.settings?.join(", ") ?? ""}
Visual DNA — People: ${dna?.people?.join(", ") ?? ""}
Visual DNA — Products: ${dna?.products?.join(", ") ?? ""}
Visual DNA — Patterns: ${dna?.patterns?.join(", ") ?? ""}
Industry Keywords: ${(brand.industryVisualKeywords ?? []).join(", ")}
`.trim();

  const campaignBlock = Object.entries(inputs)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const def = scene.inputs.find((i) => i.key === k);
      return `${def?.label ?? k}: ${v}`;
    })
    .join("\n");

  const userMessage = `
BRAND
${brandBlock}

CREATIVE TYPE
${scene.name} — ${scene.description}

SCENE INSTRUCTIONS
${scene.briefInstructions}

CAMPAIGN DETAILS
${campaignBlock}

VISUAL STYLE
${visualStyle ?? brand.visualStyle ?? "luxury-dark"}

FORMAT
${aspectNote}

Generate the Creative Brief JSON now.
`.trim();

  const raw = await callLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.7, max_tokens: 800 }
  );

  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(json) as CreativeBrief;
}

// Fallback brief when OPENROUTER_API_KEY is not set
export function buildFallbackBrief(opts: {
  scene: SceneDefinition;
  inputs: SceneInputValues;
  brand: BrandConfig;
  size: PosterSize;
}): CreativeBrief {
  const { scene, inputs, brand, size } = opts;
  const isStory = size === "story";

  const isFestival = scene.category === "festival";
  const festival = inputs.festival ?? "";
  const offerTitle = inputs.offerTitle ?? "";

  return {
    goal: isFestival
      ? `Send warm ${festival} greetings from ${brand.name} to their audience`
      : `Promote ${offerTitle} offer for ${brand.name}`,
    mood: isFestival ? "Warm Celebratory Festive" : "Premium Confident Urgent",
    scene: isFestival
      ? `A beautifully decorated Indian festive setting during ${festival}. Warm golden lighting, vibrant colours, celebratory atmosphere.`
      : `A modern Indian ${brand.subCategory || brand.industry} environment. Clean, premium, professional atmosphere.`,
    subject: isFestival
      ? "Community celebration scene with warm festive elements"
      : `Product or service showcase for ${brand.name}`,
    lighting: isFestival ? "Warm golden festive lighting with soft shadows" : "Clean studio lighting with warm corporate tones",
    composition: isStory
      ? "Subject fills upper 60%, bottom 35% kept dark for text overlay"
      : "Subject centered or right-aligned, bottom 30% kept dark for text overlay",
    reservedAreas: [
      { position: "bottom", percentage: isStory ? 35 : 30, purpose: "text overlay" },
      { position: "top-left", percentage: 8, purpose: "logo" },
    ],
    backgroundStyle: "Photorealistic premium commercial",
    visualKeywords: [
      brand.subCategory || brand.industry,
      ...(brand.industryVisualKeywords ?? []).slice(0, 4),
    ],
    colorDirective: `Use ${brand.colors.primary} as the dominant accent and ${brand.colors.secondary} for depth`,
    negativeElements: ["text", "watermarks", "logos", "distorted faces", "extra limbs", "stock photo look"],
  };
}
