import { callLLM } from "./llmAdapter";
import type { BrandConfig, SceneDefinition, SceneInputValues, PosterSize } from "./types";
import { VISUAL_TEMPLATES } from "./templates";

const SYSTEM_PROMPT = `You are a world-class creative director and AI image prompt engineer specialising in premium marketing creatives for Indian businesses.

Your task: write a structured image generation brief for an AI image model (Flux Pro).

Output format — use EXACTLY these labeled sections, nothing else:

Scene:
[Specific, cinematic scene description. Real location, lighting, atmosphere. 2-3 sentences.]

Subject:
[Main visual focus — product UI, people, or atmospheric subject. 1-2 sentences.]

Important Details:
[Brand-specific visual DNA, colors, patterns, textures, mood. Bullet points.]

Composition:
[Layout guidance, focal point, depth, aspect ratio note.]

Constraints:
No text, no letters, no words, no watermarks, no logos in the generated image.
No stock-photo look. No cartoon or illustration style.
[Add 1-2 scene-specific constraints.]

Quality:
Photorealistic. 8K resolution. Award-winning commercial photography. Premium SaaS marketing quality. LinkedIn and WhatsApp ready.

Rules you must follow:
- Be specific and cinematic — no generic descriptions
- Name exact colors using the hex values provided
- Mention the brand's visual DNA elements naturally within the scene
- For offer scenes: show the product/app UI prominently on screens
- For greeting scenes: focus on emotional warmth and community — no product
- Never include text instructions in the output (text is added separately as overlay)`;

interface PromptEngineInput {
  scene: SceneDefinition;
  inputs: SceneInputValues;
  brand: BrandConfig;
  size: PosterSize;
  visualStyle?: string;
}

export async function buildScenePrompt(opts: PromptEngineInput): Promise<string> {
  const { scene, inputs, brand, size, visualStyle } = opts;

  const style = visualStyle ?? brand.visualStyle ?? "luxury-dark";
  const template = VISUAL_TEMPLATES[style as keyof typeof VISUAL_TEMPLATES];
  const isStory = size === "story";
  const aspectNote = isStory
    ? "Vertical 4:5 portrait. Upper two-thirds: rich scene detail. Lower third: dark shadow area reserved for text overlay."
    : "Square 1:1. Lower third: dark shadow area reserved for text overlay.";

  const colorNames = (brand as unknown as Record<string, unknown>).brandVisualDNA
    ? ((brand as unknown as Record<string, Record<string, string>>).brandVisualDNA?.colorNames ?? {})
    : {};
  const primaryName = (colorNames as Record<string, string>).primary ?? "brand primary";
  const secondaryName = (colorNames as Record<string, string>).secondary ?? "brand secondary";

  const visualDNA = (brand as unknown as Record<string, unknown>).brandVisualDNA as Record<string, string[]> | undefined;

  const brandBlock = `
Brand Name: ${brand.name}
Industry: ${brand.subCategory || brand.industry}
Brand Personality: ${[brand.brandStyle, brand.brandVoice, "community-focused", "professional"].filter(Boolean).join(", ")}
Primary Color: ${brand.colors.primary} (${primaryName})
Secondary Color: ${brand.colors.secondary} (${secondaryName})
Accent Color: ${brand.colors.accent}
Visual DNA: ${[
    ...(visualDNA?.patterns ?? []),
    ...(visualDNA?.settings ?? []),
    ...(visualDNA?.people ?? []),
    ...(brand.industryVisualKeywords ?? []),
  ].filter(Boolean).slice(0, 8).join(", ")}
Target Audience: ${Array.isArray(brand.targetAudience) ? brand.targetAudience.slice(0, 2).join("; ") : brand.targetAudience ?? ""}
`.trim();

  const sceneBlock = Object.entries(inputs)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const def = scene.inputs.find((i) => i.key === k);
      return `${def?.label ?? k}: ${v}`;
    })
    .join("\n");

  const userMessage = `
${brandBlock}

Creative Type: ${scene.name}
Scene Inputs:
${sceneBlock}

Visual Style Template: ${template?.name ?? style}
Style Notes: ${template?.promptModifiers ?? ""}

Composition: ${aspectNote}

Write the structured image generation brief now. Follow the exact section format from your instructions.
`.trim();

  const result = await callLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.8, max_tokens: 700 }
  );

  return result.trim();
}

// Fallback when OPENROUTER_API_KEY not set
export function buildFallbackPrompt(
  inputs: SceneInputValues,
  brand: BrandConfig,
  size: PosterSize,
  visualStyle?: string
): string {
  const style = visualStyle ?? brand.visualStyle ?? "luxury-dark";
  const template = VISUAL_TEMPLATES[style as keyof typeof VISUAL_TEMPLATES];
  const isStory = size === "story";
  const aspect = isStory
    ? "vertical 4:5 portrait format, upper area detailed, lower third in deep shadow"
    : "square 1:1 format, lower third in deep shadow";

  const parts: string[] = [];

  if (inputs.festival) parts.push(`${inputs.festival} celebration in a premium Indian residential housing society`);
  if (inputs.mood) parts.push(`${inputs.mood.toLowerCase()} festive atmosphere`);
  if (inputs.offerTitle) parts.push(`premium marketing visual for ${inputs.offerTitle} offer`);
  if (inputs.campaignName) parts.push(`${inputs.campaignName} campaign`);

  if (template) parts.push(template.promptModifiers);

  const industry = brand.subCategory || brand.industry;
  if (industry) parts.push(`visual setting appropriate for a ${industry} brand`);

  if (brand.industryVisualKeywords?.length) {
    parts.push(brand.industryVisualKeywords.slice(0, 5).join(", "));
  }

  parts.push(
    `color palette: ${brand.colors.primary} and ${brand.colors.secondary}`,
    aspect,
    "no text, no letters, no watermarks, no logos in the image",
    "photorealistic, 8K resolution, premium corporate marketing quality, award-winning commercial photography",
    "large empty lower-third in deep shadow reserved for text overlay"
  );

  return parts.filter(Boolean).join(". ");
}
