export type VisualStyle =
  | "luxury-dark"
  | "vibrant-festive"
  | "warm-earthy"
  | "clean-modern"
  | "bold-graphic";

export type BrandStyle =
  | "Premium"
  | "Corporate"
  | "Modern"
  | "Minimal"
  | "Luxury"
  | "Friendly"
  | "Traditional"
  | "Bold";

export type BrandVoice =
  | "Professional"
  | "Friendly"
  | "Inspirational"
  | "Luxury"
  | "Youthful";

export type CreativeVisualStyle =
  | "Photorealistic"
  | "Illustration"
  | "3D"
  | "Flat Design"
  | "Modern Graphic";

export interface BrandConfig {
  // Basic (required)
  name: string;
  logoPath: string;
  industry: string;
  subCategory: string;
  tagline: string;
  website: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
    handle: string;
    address?: string;
  };

  // Advanced (optional, defaults provided)
  businessDescription?: string;
  brandStyle?: BrandStyle;
  brandVoice?: BrandVoice;
  targetAudience?: string[];
  creativeVisualStyle?: CreativeVisualStyle;
  layoutStyle?: string;
  logoPlacement?: string;
  footerNote?: string;

  // Legacy visual style (kept for image template selection)
  visualStyle: VisualStyle;

  // AI-enriched (auto-generated, cached)
  brandSummary?: string;
  visualDirection?: string;
  industryVisualKeywords?: string[];
  brandVisualDNA?: {
    colorNames: { primary: string; secondary: string };
    patterns: string[];
    settings: string[];
    people: string[];
    products: string[];
  };
}

export interface Occasion {
  id: string;
  date: string;
  title: string;
  subtext: string;
  promptHints: string;
  theme: "festive" | "national" | "awareness" | "promo";
}

export interface OfferInput {
  headline: string;
  subtext: string;
  cta?: string;
  validity?: string;
  promptHints: string;
  theme: "promo";
}

// Creative Brief — structured output from the Creative Director LLM call
export interface ReservedArea {
  position: "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  percentage: number;
  purpose: string;
}

export interface CreativeBrief {
  goal: string;
  mood: string;
  scene: string;
  subject: string;
  lighting: string;
  composition: string;
  reservedAreas: ReservedArea[];
  backgroundStyle: string;
  visualKeywords: string[];
  colorDirective: string;
  negativeElements: string[];
}

// Scene system
export type SceneCategory = "festival" | "offer" | "event";

export type SceneInputType = "text" | "select" | "textarea" | "date";

export interface SceneInputDef {
  key: string;
  label: string;
  type: SceneInputType;
  required: boolean;
  placeholder?: string;
  suggestions?: string[];
  options?: string[];       // for select type
  randomizable?: boolean;
  default?: string;
}

export interface SceneDefinition {
  id: string;
  name: string;
  icon: string;
  category: SceneCategory;
  description: string;
  inputs: SceneInputDef[];
  // Creative Director guidance — shapes the brief, not the prompt
  visualTheme: string;
  briefInstructions: string;
}

export type SceneInputValues = Record<string, string>;

export interface GenerateSceneRequest {
  sceneId: string;
  inputs: SceneInputValues;
  sizes: PosterSize[];
  visualStyle?: VisualStyle;
}

export type PosterMode = "occasion" | "offer";

export interface PosterRequest {
  mode: PosterMode;
  occasion?: Occasion;
  offer?: OfferInput;
  sizes: PosterSize[];
  visualStyle?: VisualStyle;
}

export type PosterSize = "square" | "story";

export interface SizeConfig {
  width: number;
  height: number;
  label: string;
}

export const SIZE_CONFIGS: Record<PosterSize, SizeConfig> = {
  square: { width: 1080, height: 1080, label: "1080×1080 (Post)" },
  story: { width: 1080, height: 1920, label: "1080×1920 (Story/Status)" },
};

export interface GeneratedPoster {
  size: PosterSize;
  dataUrl: string;
  filename: string;
  brief?: CreativeBrief;
  prompt?: string;
}

export interface GenerateResponse {
  posters: GeneratedPoster[];
}

export interface LLMConfig {
  provider: "openrouter";
  model: string;
  apiKey: string;
}
