import { callLLM } from "./llmAdapter";
import type { BrandConfig, SceneDefinition, SceneInputValues, PosterSize, CreativeBrief } from "./types";

const SYSTEM_PROMPT = `You are a Senior Creative Director at a global advertising agency specializing in premium SaaS and corporate marketing for Indian businesses.

Your job is NOT to write an image prompt.

Your job is to analyse the business, the campaign, and the scene — then return a structured Creative Brief as JSON.

Think like a designer, not a writer:
- Use NOUNS and VISUAL DESCRIPTORS, not long sentences
- Scene descriptions must read like a shot list, not a story
- Every detail must be composable into a real advertising image

Rules:
- scene: write in visual noun phrases — "luxury apartment courtyard", "families in festive attire", "color powder in air" — NOT paragraphs
- subject: describe what the camera focuses on — who, where, doing what — visual and specific
- emotions: list what the viewer should FEEL, not what is happening
- cameraDirection: specify lens, angle, framing like a cinematographer — exact and actionable
- brandPlacement: specific position, size, contrast requirement — never vague
- typographySafeZone: describe WHERE the smooth, uninterrupted background area is for headline copy
- businessRelevanceCues: list 3-5 subtle visual elements specific to THIS industry/business — not generic office
- Reserved areas are CRITICAL — the text overlay engine depends on them
- visualKeywords must be specific to THIS industry — never generic SaaS words
- negativeElements must prevent common AI mistakes for this specific scene type

Return ONLY valid JSON matching this exact structure:
{
  "goal": "one sentence — campaign objective and WHY this image exists",
  "mood": "2-3 precise mood words",
  "scene": "visual noun phrases only — location, atmosphere, elements — no full sentences",
  "subject": "camera focus — who, position, action — visual and specific",
  "lighting": "exact lighting direction, quality, and color temperature",
  "composition": "visual weight description — where subject sits, foreground/midground/background layers",
  "reservedAreas": [
    { "position": "bottom", "percentage": 30, "purpose": "headline and CTA text overlay" },
    { "position": "top-left", "percentage": 8, "purpose": "logo placement" }
  ],
  "backgroundStyle": "3-5 word visual style descriptor",
  "visualKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "colorDirective": "specific instruction on where and how to use each brand color",
  "negativeElements": ["specific thing to avoid 1", "specific thing to avoid 2", "specific thing to avoid 3", "specific thing to avoid 4"],
  "emotions": ["Trust", "Community", "Celebration"],
  "cameraDirection": "lens mm, angle, framing style, depth of field",
  "brandPlacement": "exact position, approximate size, background contrast requirement",
  "typographySafeZone": "describe the smooth uninterrupted area where headline copy will be placed",
  "businessRelevanceCues": ["industry-specific visual cue 1", "industry-specific visual cue 2", "industry-specific visual cue 3"]
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
    ? "Vertical portrait (9:16). Main subject upper 60%. Bottom 35% must be smooth and dark for text overlay. Top-left corner clear for logo."
    : "Square (1:1). Bottom 30% must be smooth and dark for text overlay. Main subject centered or right-aligned. Top-left corner clear for logo.";

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
Brand Style: ${brand.brandStyle ?? "Premium"} | Voice: ${brand.brandVoice ?? "Professional"}
Brand Personality Traits: Trustworthy, Professional, Technology-forward, Community-focused, Modern Indian
Target Audience: ${Array.isArray(brand.targetAudience) ? brand.targetAudience.join("; ") : brand.targetAudience ?? ""}
Primary Color: ${brand.colors.primary}${dna?.colorNames?.primary ? ` (${dna.colorNames.primary})` : ""}
Secondary Color: ${brand.colors.secondary}${dna?.colorNames?.secondary ? ` (${dna.colorNames.secondary})` : ""}
Accent Color: ${brand.colors.accent}
Brand Summary: ${(brand as unknown as Record<string, string>).brandSummary ?? ""}
Visual DNA — Settings: ${dna?.settings?.join(", ") ?? ""}
Visual DNA — People: ${dna?.people?.join(", ") ?? ""}
Visual DNA — Industry Keywords: ${(brand.industryVisualKeywords ?? []).join(", ")}
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

FORMAT & LAYOUT
${aspectNote}

Generate the Creative Brief JSON now.
`.trim();

  const raw = await callLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.7, max_tokens: 1000 }
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
      ? `Generate hero artwork for a premium ${festival} greeting campaign for ${brand.name} — evoke trust, community, and celebration`
      : `Generate hero artwork for a ${offerTitle} offer campaign for ${brand.name} — convey premium value and urgency`,
    mood: isFestival ? "Warm Celebratory Premium" : "Confident Urgent Premium",
    scene: isFestival
      ? `Modern luxury residential complex courtyard, families celebrating ${festival}, color powder in air, festive attire, premium landscaped gardens, elegant architecture`
      : `Modern Indian ${brand.subCategory || brand.industry} environment, professionals engaged, premium office interior, clean minimal aesthetic`,
    subject: isFestival
      ? "Three families, center-right frame, natural candid celebration moment, children playing foreground, adults interacting midground"
      : `Professional target audience using ${brand.name} product, satisfied expression, premium environment`,
    lighting: isFestival ? "Warm golden-hour sunlight, soft natural shadows, festive color glow" : "Clean diffused studio lighting, warm corporate tones, soft highlights",
    composition: isStory
      ? "Subject fills upper 60%, hero families right-center, negative space bottom for text, foreground color powder, background apartment towers"
      : "Subject right-center, negative space bottom-left for text, foreground color powder, midground families, background residential towers",
    reservedAreas: [
      { position: "bottom", percentage: isStory ? 35 : 30, purpose: "headline and CTA text overlay" },
      { position: "top-left", percentage: 8, purpose: "logo placement" },
    ],
    backgroundStyle: "Photorealistic premium commercial lifestyle",
    visualKeywords: [
      brand.subCategory || brand.industry,
      ...(brand.industryVisualKeywords ?? []).slice(0, 4),
    ],
    colorDirective: `Use ${brand.colors.primary} as subtle accent in clothing or decor. ${brand.colors.secondary} for depth in shadows. Keep bottom zone dark and smooth.`,
    negativeElements: ["text overlays", "watermarks", "distorted faces", "extra fingers", "malformed hands", "blurry faces", "floating objects"],
    emotions: isFestival ? ["Trust", "Community", "Belonging", "Celebration", "Prosperity"] : ["Confidence", "Value", "Urgency", "Trust", "Professionalism"],
    cameraDirection: "Eye-level shot, 35mm lens, natural depth of field, wide composition, center-weighted framing, professional advertising photography",
    brandPlacement: `Logo top-left corner, approximately 8% image width, clear 20px margin on all sides, placed over dark uncluttered background area`,
    typographySafeZone: `Bottom ${isStory ? "35" : "30"}% of image — smooth, dark, uninterrupted background. No faces, no bright highlights, no color splashes in this zone. Gradient to dark if needed.`,
    businessRelevanceCues: isFestival
      ? ["modern residential complex entrance", "society clubhouse", "well-maintained common area", "premium landscaping"]
      : ["modern office interior", "professional workspace", "corporate meeting room", "digital interface on screen"],
  };
}
