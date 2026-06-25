import type { CreativeRecipe, BrandConfig, PosterSize, VisualStyle, CreativeBrief } from "./types";
import {
  pickSceneEnvironment,
  pickStyle,
  pickCamera,
  pickLighting,
  pickComposition,
  type SceneEnvironmentKey,
} from "./engines";

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
  const domains = (brand as unknown as Record<string, unknown>).businessDomain as string[] | undefined;

  return {
    campaign: brief.goal,
    mood: brief.mood,
    environment: pickSceneEnvironment(envKey, seed),
    subject: brief.subject,
    businessCues: (brief.businessRelevanceCues ?? []).slice(0, 3),
    camera: brief.cameraDirection ? brief.cameraDirection : pickCamera(seed),
    lighting: brief.lighting ? brief.lighting : pickLighting(seed),
    composition: pickComposition(size, seed),
    style: pickStyle(seed),
    colorAccent: `${brand.colors.primary} appears subtly as a warm accent in the environment — cushions, decorative details, warm light spill. ${brand.colors.secondary} provides richness in shadows and depth.`,
    negativeExtra: brief.negativeElements ?? [],
    brief,
  };
}

// ─── Prompt assembler — prose format, NO section headers ─────────────────────

export function buildPromptFromRecipe(recipe: CreativeRecipe, size: PosterSize): string {
  const sizeNote = size === "story"
    ? "Vertical 9:16 portrait format."
    : "Square 1:1 format.";

  const businessCueNote = recipe.businessCues.length > 0
    ? `Environmental details include: ${recipe.businessCues.join(", ")}.`
    : "";

  const negatives = [
    "any text", "letters", "words", "typography", "watermarks", "logos",
    "labels", "signage with readable text", "UI overlays", "dashboards",
    "software interfaces", "readable screens", "hex color codes",
    "speech bubbles", "error messages", "notifications", "posters with writing",
    "stock photo aesthetic", "cartoon", "illustration", "flat design",
    "extra fingers", "distorted anatomy", "blurry faces", "malformed hands",
    "more than three people in primary focus", "crowded scenes",
    "staged poses", "direct camera stares", "exaggerated expressions",
    "floating objects", "cropped heads at frame edges",
    ...(recipe.negativeExtra ?? []),
  ];

  return `Premium commercial background artwork. ${sizeNote} ${recipe.style}.

${recipe.environment}. ${businessCueNote}

${recipe.subject}. Maximum two to three people in the primary foreground — natural, candid, unposed. Additional people softly in the midground or background only.

${recipe.camera}. ${recipe.lighting}.

${recipe.composition} The upper-left corner of the image is naturally uncluttered with a smooth, slightly darker area. The lower portion of the image gradually transitions to a darker, smooth, detail-free zone — achieved through natural shadow, depth of field fade, or environmental gradient. No important visual elements in these areas.

${recipe.colorAccent}

Atmosphere communicates: ${recipe.mood}. The image should feel ${recipe.campaign.toLowerCase().includes("festival") ? "warm, celebratory, and human" : "professional, trustworthy, and modern"} without any visible branding or text.

Avoid: ${negatives.join(", ")}.

Photorealistic. High dynamic range. Natural materials. Rich textures. Luxury commercial photography standard.`.trim();
}

// ─── Legacy convenience wrapper (used by generate-scene to preview prompts) ──

export function buildPromptFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig,
  size: PosterSize,
  _visualStyle: VisualStyle,
  sceneId = "offer-campaign",
  seed?: string,
): string {
  const effectiveSeed = seed ?? sceneId + size + Date.now().toString(36);
  const recipe = buildRecipeFromBrief(brief, brand, sceneId, size, effectiveSeed);
  return buildPromptFromRecipe(recipe, size);
}
