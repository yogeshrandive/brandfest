import type {
  CreativeRecipe,
  BrandConfig,
  PosterSize,
  CreativeBrief,
  CreativeStyle,
  ImageStyle,
  Subcategory,
} from "./types";
import { pickCamera, pickLighting, pickComposition, pickFrom } from "./engines";
import { STYLE_DEFINITIONS } from "./styles";

export interface TextOverlayContent {
  headline: string;
  subtext?: string;
  cta?: string;
  validity?: string;
  fromName?: string;
}

// ─── Image-style → internal creative-style + FAL model ──────────────────────────

export const IMAGE_STYLE_TO_CREATIVE: Record<ImageStyle, CreativeStyle> = {
  "real-human": "lifestyle",
  "vector": "graphical",
};

export function getModelForImageStyle(imageStyle: ImageStyle): string {
  const creative = IMAGE_STYLE_TO_CREATIVE[imageStyle] ?? "lifestyle";
  return STYLE_DEFINITIONS[creative]?.model ?? "fal-ai/flux-pro/v1.1-ultra";
}

// ─── Recipe builder ─────────────────────────────────────────────────────────────

export function buildRecipeFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig | undefined,
  subcategory: Subcategory | undefined,
  size: PosterSize,
  seed: string,
): CreativeRecipe {
  // The LLM's tailored scene idea is primary; fall back to the subcategory library.
  const environment = brief.scene || pickFrom(subcategory?.sceneEnvironments, seed, "clean modern business setting");

  return {
    campaign: brief.goal,
    mood: brief.mood,
    environment,
    subject: brief.subject,
    businessCues: (brief.businessRelevanceCues ?? []).slice(0, 3),
    camera: brief.cameraDirection ? brief.cameraDirection : pickCamera(seed),
    lighting: brief.lighting ? brief.lighting : pickLighting(seed),
    composition: pickComposition(size, seed),
    style: "premium commercial advertising",
    // Natural-language color guidance — strip any hex codes so FAL never renders them.
    colorAccent: brief.colorDirective
      ? brief.colorDirective.replace(/#[0-9a-fA-F]{3,6}/g, "the brand accent")
      : "Warm accent tones appear naturally in the scene. Clean negative space is preserved for branding.",
    negativeExtra: brief.negativeElements ?? [],
    brief,
  };
}

// ─── Style-aware prompt builder ───────────────────────────────────────────────

export function buildPromptFromRecipe(
  recipe: CreativeRecipe,
  size: PosterSize,
  creativeStyle: CreativeStyle = "lifestyle",
): string {
  const styleDef = STYLE_DEFINITIONS[creativeStyle] ?? STYLE_DEFINITIONS["lifestyle"];
  return styleDef.buildPrompt(recipe, size);
}

// Convenience: go straight from brief + image style to a FAL prompt.
export function buildPromptForImageStyle(
  brief: CreativeBrief,
  brand: BrandConfig | undefined,
  subcategory: Subcategory | undefined,
  size: PosterSize,
  imageStyle: ImageStyle,
  seed: string,
): string {
  const recipe = buildRecipeFromBrief(brief, brand, subcategory, size, seed);
  const creative = IMAGE_STYLE_TO_CREATIVE[imageStyle] ?? "lifestyle";
  return buildPromptFromRecipe(recipe, size, creative);
}
