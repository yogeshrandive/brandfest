import { callLLM } from "./llmAdapter";
import type { BrandConfig, SceneDefinition, SceneInputValues, PosterSize } from "./types";
import { VISUAL_TEMPLATES } from "./templates";

const SYSTEM_PROMPT = `You are a world-class creative director specialising in commercial photography and social media advertising for Indian businesses.

Your task: generate a rich, specific image generation prompt for an AI image model (Flux Pro).

Rules:
- Output ONLY the image prompt — no explanation, no preamble, no quotes
- The prompt must describe a photorealistic scene (no illustrations, no text in image)
- Always include: lighting details, depth of field, colour palette, atmosphere, composition
- Always end with: "large empty lower-third area in deep shadow reserved for text overlay, no text no letters no watermarks, 8K resolution, award-winning commercial photography"
- Tailor imagery to the business type and target audience
- Match the mood and visual style specified
- Be specific and cinematic — avoid generic descriptions`;

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
  const aspect = isStory
    ? "vertical 9:16 portrait format, upper two-thirds detailed, lower third in deep shadow"
    : "square 1:1 format, lower third in deep shadow";

  const brandContext = [
    `Business: ${brand.name}`,
    `Industry: ${brand.subCategory || brand.industry}`,
    brand.businessDescription ? `Description: ${brand.businessDescription}` : "",
    brand.targetAudience?.length
      ? `Target audience: ${brand.targetAudience.join(", ")}`
      : "",
    `Brand style: ${brand.brandStyle ?? "Premium"}`,
    `Brand voice: ${brand.brandVoice ?? "Professional"}`,
    `Primary colour: ${brand.colors.primary}`,
    `Secondary colour: ${brand.colors.secondary}`,
    brand.industryVisualKeywords?.length
      ? `Visual keywords for this industry: ${brand.industryVisualKeywords.join(", ")}`
      : "",
  ].filter(Boolean).join("\n");

  const sceneContext = Object.entries(inputs)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const def = scene.inputs.find((i) => i.key === k);
      return `${def?.label ?? k}: ${v}`;
    })
    .join("\n");

  const userMessage = `
Brand Context:
${brandContext}

Scene Type: ${scene.name}
Scene Inputs:
${sceneContext}

Visual Style: ${template?.name ?? style} — ${template?.promptModifiers ?? ""}
Image Format: ${aspect}

Generate the image prompt now.`.trim();

  const result = await callLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.85, max_tokens: 600 }
  );

  return result.trim();
}

// Fallback: build prompt without LLM (used if OPENROUTER_API_KEY not set)
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
    ? "vertical portrait 9:16 tall-format composition, upper area detailed, lower area in deep shadow"
    : "square 1:1 format composition, lower third in deep shadow";

  const parts: string[] = [];

  if (inputs.festival) parts.push(`${inputs.festival} celebration atmosphere`);
  if (inputs.mood) parts.push(`${inputs.mood.toLowerCase()} mood`);
  if (inputs.offerTitle) parts.push(`promotional visual for ${inputs.offerTitle}`);
  if (inputs.campaignName) parts.push(`${inputs.campaignName} campaign`);

  if (template) parts.push(template.promptModifiers);
  if (brand.subCategory || brand.industry) {
    parts.push(`visual context fitting a ${brand.subCategory || brand.industry} brand`);
  }
  if (brand.targetAudience?.length) {
    parts.push(`imagery resonating with ${brand.targetAudience.join(" and ")}`);
  }
  if (brand.industryVisualKeywords?.length) {
    parts.push(brand.industryVisualKeywords.slice(0, 4).join(", "));
  }

  parts.push(
    `colour palette anchored by ${brand.colors.primary} and ${brand.colors.secondary}`,
    aspect,
    "large empty lower-third area in deep shadow reserved for text overlay, no text no letters no watermarks, 8K resolution, award-winning commercial photography"
  );

  return parts.filter(Boolean).join(", ");
}
