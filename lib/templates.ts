import type { VisualStyle } from "./types";

export interface VisualTemplate {
  id: VisualStyle;
  name: string;
  description: string;
  promptModifiers: string;
}

export const VISUAL_TEMPLATES: Record<VisualStyle, VisualTemplate> = {
  "luxury-dark": {
    id: "luxury-dark",
    name: "Luxury Dark",
    description: "Deep tones, gold particles, cinematic bokeh",
    promptModifiers:
      "cinematic luxury aesthetic, deep black and obsidian background, scattered gold dust particles, ultra-shallow depth of field bokeh lights, dramatic moody rim lighting, premium high-end commercial photography, rich deep shadows with gold highlights, opulent atmosphere",
  },
  "vibrant-festive": {
    id: "vibrant-festive",
    name: "Vibrant Festive",
    description: "Saturated colours, energetic, mass-market celebration",
    promptModifiers:
      "vibrant hyper-saturated colours, high-energy festive atmosphere, dynamic radial burst composition, colourful bokeh circles, festive sparkles and light bursts, bright joyful uplifting mood, cheerful mass-market celebration energy",
  },
  "warm-earthy": {
    id: "warm-earthy",
    name: "Warm Earthy",
    description: "Marigold, terracotta, organic — traditional Indian",
    promptModifiers:
      "warm earthy terracotta and marigold orange tones, organic natural textures, soft golden-hour sunlight, traditional Indian handcraft aesthetic, aged warmth and sun-baked earth tones, natural dyes colour palette, artisanal handmade quality",
  },
  "clean-modern": {
    id: "clean-modern",
    name: "Clean Modern",
    description: "Soft gradients, geometric, airy — corporate trust",
    promptModifiers:
      "clean minimal contemporary design aesthetic, soft pastel gradient background, precise geometric abstract shapes, airy generous white space, modern corporate design language, subtle glass morphism and frosted effects, professional editorial photography style",
  },
  "bold-graphic": {
    id: "bold-graphic",
    name: "Bold Graphic",
    description: "High contrast, dramatic beams — offers and urgency",
    promptModifiers:
      "bold high-contrast graphic design composition, dramatic diagonal light beams cutting through darkness, strong geometric shapes, electric neon accent highlights, commercial advertising visual impact, dynamic motion-blur energy, striking eye-catching design",
  },
};

export const VISUAL_STYLE_ORDER: VisualStyle[] = [
  "luxury-dark",
  "vibrant-festive",
  "warm-earthy",
  "clean-modern",
  "bold-graphic",
];
