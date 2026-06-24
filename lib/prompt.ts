import type { BrandConfig, Occasion, OfferInput } from "./types";
import { VISUAL_TEMPLATES } from "./templates";

const STYLE_SUFFIX =
  "photorealistic digital art, highly detailed, 8K resolution, professional quality, " +
  "large empty lower-third area reserved for text overlay — keep it visually clear and dark, " +
  "no text, no letters, no words, no numbers, no captions, no watermarks, no logos, " +
  "full bleed background illustration, sharp focus, award-winning commercial photography";

export function buildPrompt(
  source: Occasion | OfferInput,
  brand: BrandConfig,
  width: number,
  height: number
): string {
  const template = VISUAL_TEMPLATES[brand.visualStyle ?? "luxury-dark"];
  const isStory = height > width;
  const aspectNote = isStory
    ? "vertical portrait 9:16 tall-format composition, upper area detailed, lower area in deep shadow"
    : "square 1:1 format composition, lower third in deep shadow";

  const parts: string[] = [source.promptHints, template.promptModifiers];

  const category = brand.subCategory || brand.industry;
  if (category) {
    parts.push(`visual context and setting fitting a ${category} brand`);
  }

  const audience = Array.isArray(brand.targetAudience)
    ? brand.targetAudience.join(", ")
    : brand.targetAudience;
  if (audience) {
    parts.push(`imagery that emotionally resonates with ${audience}`);
  }

  parts.push(
    `colour palette anchored by ${brand.colors.primary} gold and ${brand.colors.secondary} deep tones`,
    aspectNote,
    STYLE_SUFFIX
  );

  return parts.filter(Boolean).join(", ");
}
