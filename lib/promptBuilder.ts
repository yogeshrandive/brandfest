import type { CreativeRecipe, BrandConfig, PosterSize, VisualStyle, CreativeBrief, CreativeStyle } from "./types";
import {
  pickSceneEnvironment,
  pickCamera,
  pickLighting,
  pickComposition,
  type SceneEnvironmentKey,
} from "./engines";
import { STYLE_DEFINITIONS, getDefaultStyle } from "./styles";

export interface TextOverlayContent {
  headline: string;
  subtext?: string;
  cta?: string;
  validity?: string;
  fromName?: string;
}

// Maps scene IDs to environment library keys
const SCENE_TO_ENV: Record<string, SceneEnvironmentKey> = {
  "festival-greeting": "festival-courtyard",
  "offer-campaign": "society-office",
  "society-office": "society-office",
  "apartment-lobby": "apartment-lobby",
  "agm-hall": "agm-hall",
  "society-garden": "society-garden",
  "building-entrance": "building-entrance",
  "clubhouse": "clubhouse",
};

// ─── Recipe builder ───────────────────────────────────────────────────────────

export function buildRecipeFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig,
  sceneId: string,
  size: PosterSize,
  seed: string,
): CreativeRecipe {
  const envKey: SceneEnvironmentKey = SCENE_TO_ENV[sceneId] ?? "abstract";

  return {
    campaign: brief.goal,
    mood: brief.mood,
    environment: pickSceneEnvironment(envKey, seed),
    subject: brief.subject,
    businessCues: (brief.businessRelevanceCues ?? []).slice(0, 3),
    camera: brief.cameraDirection ? brief.cameraDirection : pickCamera(seed),
    lighting: brief.lighting ? brief.lighting : pickLighting(seed),
    composition: pickComposition(size, seed),
    // Natural language color descriptions — no hex codes in FAL prompt
    style: "premium commercial advertising",
    colorAccent: `Warm honey-gold accents appear naturally in the environment — warm light spill, golden material details, decorative elements. Deep navy provides richness in shadows and depth. Clean white highlights used sparingly.`,
    negativeExtra: brief.negativeElements ?? [],
    brief,
  };
}

// ─── Style-aware prompt builder ───────────────────────────────────────────────

export function buildPromptFromRecipe(
  recipe: CreativeRecipe,
  size: PosterSize,
  creativeStyle: CreativeStyle = "realistic",
): string {
  const styleDef = STYLE_DEFINITIONS[creativeStyle] ?? STYLE_DEFINITIONS["realistic"];
  return styleDef.buildPrompt(recipe, size);
}

// ─── FAL model selector ───────────────────────────────────────────────────────

export function getModelForStyle(creativeStyle: CreativeStyle): string {
  return STYLE_DEFINITIONS[creativeStyle]?.model ?? "fal-ai/flux-pro/v1.1-ultra";
}

// ─── Legacy convenience wrapper (used by generate-scene to preview prompts) ──

export function buildPromptFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig,
  size: PosterSize,
  _visualStyle: VisualStyle,
  sceneId = "offer-campaign",
  seed?: string,
  creativeStyle?: CreativeStyle,
): string {
  const effectiveSeed = seed ?? sceneId + size + Date.now().toString(36);
  const effectiveStyle = creativeStyle ?? getDefaultStyle(sceneId);
  const recipe = buildRecipeFromBrief(brief, brand, sceneId, size, effectiveSeed);
  return buildPromptFromRecipe(recipe, size, effectiveStyle);
}
