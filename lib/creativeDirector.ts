import { callLLM } from "./llmAdapter";
import type { BrandConfig, SceneDefinition, SceneInputValues, PosterSize, CreativeBrief } from "./types";

const SYSTEM_PROMPT = `You are an Art Director briefing a background art commission for a premium corporate advertising campaign.

Your job is NOT to write an image prompt.
Your job is to analyse the business, campaign, and scene — then return a structured Creative Brief as JSON.

The artwork you are commissioning is BACKGROUND ART ONLY.
No text will appear in the image. No logo. No UI. No screens.
Typography, logo, and CTA will be composited on top by the design system afterwards.

Think like a photographer commissioning hero editorial artwork:
- Use VISUAL NOUNS only — not sentences or explanations
- Scene = environment description (materials, architecture, atmosphere)
- Subject = camera focus (who, position, natural action)
- Every detail must produce a real, printable advertising photograph

Rules:
- scene: environment noun phrases — "marble-floored apartment lobby", "sunlit society garden", "warm committee meeting room" — NOT stories
- subject: who the camera focuses on, position, natural candid action — specific and visual
- Do NOT include product UI, dashboards, or software screens in scene or subject
- designIntent: exactly 7 professional trait words that define what the image should communicate
- visualHierarchy: ordered list of 4-5 elements from most to least visually prominent
- businessRelevanceCues: 3-5 environment/prop details specific to housing society management (not generic SaaS)
- typographySafeZone: exact area for text — no faces, no bright highlights, must support white type
- backgroundQuality: lighting, texture, and material descriptors for the environment
- negativeElements: things specific to THIS scene that AI commonly gets wrong

Return ONLY valid JSON matching this exact structure:
{
  "goal": "one sentence — what this background artwork must communicate visually",
  "mood": "2-3 precise mood words",
  "scene": "environment noun phrases only — location, materials, atmosphere — no full sentences",
  "subject": "camera focus — who, position, natural candid action — visual and specific",
  "lighting": "exact lighting direction, quality, and color temperature",
  "composition": "visual weight — where subject sits, foreground/midground/background layers, quadrant weighting",
  "reservedAreas": [
    { "position": "bottom", "percentage": 30, "purpose": "headline and CTA text overlay" },
    { "position": "top-left", "percentage": 8, "purpose": "logo placement" }
  ],
  "backgroundStyle": "3-5 word visual style descriptor",
  "backgroundQuality": "lighting quality, material textures, architectural finish — noun phrases",
  "visualKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "colorDirective": "specific instruction on where brand colors appear naturally in the environment",
  "negativeElements": ["scene-specific AI mistake 1", "scene-specific AI mistake 2", "scene-specific AI mistake 3"],
  "emotions": ["Emotion1", "Emotion2", "Emotion3"],
  "cameraDirection": "lens mm, angle, framing, depth of field — like a cinematographer",
  "brandPlacement": "exact position and size for logo — always top-left, 8% image width, dark background",
  "typographySafeZone": "exact area description — smooth, dark, no faces, supports white typography",
  "businessRelevanceCues": ["housing-society-specific prop 1", "housing-society-specific prop 2", "housing-society-specific prop 3"],
  "designIntent": ["Professional", "Premium", "Trustworthy", "Modern", "Organized", "Technology-Enabled", "Community-Focused"],
  "visualHierarchy": ["Primary: people collaborating", "Secondary: premium environment", "Third: architectural context", "Fourth: subtle technology cues"]
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
    ? "Vertical 9:16. Subject fills upper 60%. Bottom 35% smooth and dark for text. Top-left clear for logo."
    : "Square 1:1. Bottom 30% smooth and dark for text. Subject center or right-weighted. Top-left clear for logo.";

  const dna = (brand as unknown as Record<string, unknown>).brandVisualDNA as {
    colorNames?: { primary?: string; secondary?: string };
    settings?: string[];
    people?: string[];
  } | undefined;

  const domains = (brand as unknown as Record<string, unknown>).businessDomain as string[] | undefined;
  const environments = (brand as unknown as Record<string, unknown>).societyVisualEnvironments as string[] | undefined;

  const brandBlock = `
Business: ${brand.name}
Business Domain: ${domains?.join(", ") ?? brand.subCategory ?? brand.industry}
Description: ${brand.businessDescription ?? ""}
Brand Style: ${brand.brandStyle ?? "Premium"} | Voice: ${brand.brandVoice ?? "Professional"}
Target Audience: ${Array.isArray(brand.targetAudience) ? brand.targetAudience.join("; ") : brand.targetAudience ?? ""}
Primary Color: ${brand.colors.primary}${dna?.colorNames?.primary ? ` (${dna.colorNames.primary})` : ""}
Secondary Color: ${brand.colors.secondary}${dna?.colorNames?.secondary ? ` (${dna.colorNames.secondary})` : ""}
Accent: ${brand.colors.accent}
Visual Environments (use these for businessRelevanceCues): ${environments?.join(", ") ?? dna?.settings?.join(", ") ?? ""}
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

SCENE TYPE
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
    { temperature: 0.7, max_tokens: 1200 }
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
  const bottomPct = isStory ? 35 : 30;

  return {
    goal: isFestival
      ? `Premium background artwork for a ${festival} greeting campaign — communicate community warmth and celebration through environment and people alone`
      : `Premium background artwork for a ${offerTitle} campaign — communicate professional trust and value through environment and people alone`,
    mood: isFestival ? "Warm Celebratory Premium" : "Confident Professional Premium",
    scene: isFestival
      ? `Modern luxury residential complex courtyard, festive string lights overhead, manicured garden, premium stone pathways, warm evening atmosphere, elegant apartment towers in background`
      : `Modern Indian society management office, warm ambient lighting, premium wood furniture, printed financial registers on desk, large windows with residential complex view`,
    subject: isFestival
      ? "Three families in festive attire, natural candid interaction, children in foreground, adults smiling in midground, all right-center frame"
      : "Two committee members reviewing printed financial documents, natural engaged discussion, one laptop open screen blurred, warm confident expressions",
    lighting: isFestival
      ? "Warm golden-hour sunlight from right, soft festive string light glow, natural evening color warmth"
      : "Warm diffused indoor light, soft window light from left, clean professional ambiance",
    composition: isStory
      ? "Subject fills upper 60%, hero group right-center, foreground decorative elements, background architecture soft-blurred, bottom 35% smooth dark gradient"
      : "Subject right-center quadrant, foreground desk textures, background soft-blurred architecture, bottom-left open and smooth, visual weight upper-right",
    reservedAreas: [
      { position: "bottom", percentage: bottomPct, purpose: "headline and CTA text overlay" },
      { position: "top-left", percentage: 8, purpose: "logo placement" },
    ],
    backgroundStyle: "Photorealistic premium commercial lifestyle",
    backgroundQuality: "Luxury architecture, warm natural light, premium materials, rich wood and marble textures, soft depth of field",
    visualKeywords: [
      "premium residential community",
      "housing society management",
      "professional committee",
      "modern Indian architecture",
      "trust and organization",
    ],
    colorDirective: `${brand.colors.primary} appears subtly in accent details — cushions, plants, warm lights. ${brand.colors.secondary} provides depth in shadows and dark areas. Bottom zone graduates to dark for text readability.`,
    negativeElements: [
      "software dashboards", "UI screenshots", "readable laptop screens",
      "generic office cubicles", "empty white walls", "posed stock photography",
    ],
    emotions: isFestival
      ? ["Community", "Belonging", "Celebration", "Warmth", "Prosperity"]
      : ["Trust", "Professionalism", "Confidence", "Reliability", "Modern"],
    cameraDirection: "Eye-level, 35mm lens, f/2.8 natural depth of field, wide composition, center-weighted framing",
    brandPlacement: "Logo top-left, approximately 8% image width, clear 20px margin, placed over dark smooth background area",
    typographySafeZone: `Bottom ${bottomPct}% of image — smooth dark gradient, no faces, no bright highlights, no architectural lines crossing this zone. Must support white sans-serif typography at any size.`,
    businessRelevanceCues: isFestival
      ? ["modern residential complex entrance", "society clubhouse exterior", "manicured common area garden", "premium apartment towers"]
      : ["society management office interior", "printed financial registers and ledgers", "committee meeting table", "residential complex view through window"],
    designIntent: ["Professional", "Premium", "Trustworthy", "Modern", "Organized", "Technology-Enabled", "Community-Focused"],
    visualHierarchy: [
      "Primary: people in natural candid interaction",
      "Secondary: premium environment and workspace",
      "Third: residential architecture context",
      "Fourth: subtle technology cues (implied)",
    ],
  };
}
