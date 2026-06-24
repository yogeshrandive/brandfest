import type { BrandConfig, Occasion, OfferInput } from "./types";

const STYLE_SUFFIX =
  "photorealistic digital art, highly detailed, professional quality, " +
  "clean composition with large empty lower third area reserved for text overlay, " +
  "no text, no letters, no words, no numbers, no captions, no watermarks, no logos, " +
  "full bleed background illustration, vibrant colors, sharp focus";

export function buildPrompt(
  source: Occasion | OfferInput,
  brand: BrandConfig,
  width: number,
  height: number
): string {
  const isStory = height > width;
  const aspectNote = isStory
    ? "vertical portrait 9:16 composition"
    : "square 1:1 composition";

  const colorNote = `color palette inspired by ${brand.colors.primary} gold and ${brand.colors.secondary} dark tones`;

  return [source.promptHints, colorNote, aspectNote, STYLE_SUFFIX]
    .filter(Boolean)
    .join(", ");
}
