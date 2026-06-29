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

  // Selected taxonomy (drives the creative engine for this business)
  industryId?: string;
  subcategoryId?: string;
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

// Where the logo should sit, and how big — planned by the LLM so the
// background art reserves matching empty space. Consumed by the compositor.
export interface LogoSpec {
  position: "top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right";
  widthPct: number; // logo width as a percentage of image width (e.g. 28)
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
  backgroundQuality: string;
  visualKeywords: string[];
  colorDirective: string;
  negativeElements: string[];
  emotions: string[];
  cameraDirection: string;
  brandPlacement: string;
  typographySafeZone: string;
  businessRelevanceCues: string[];
  designIntent: string[];
  visualHierarchy: string[];
  logoSpec?: LogoSpec;
}

// ─── Industry taxonomy ──────────────────────────────────────────────────────
// The business-agnostic replacement for SocietyBee-specific scenes. An industry
// holds subcategories; each subcategory gives the LLM concrete scene material.

export interface Subcategory {
  id: string;
  name: string;
  description: string;
  sceneEnvironments: string[]; // realistic settings for this business type
  props: string[];             // business-relevant objects/details
  moods: string[];
  greetingExamples: string[];  // sample greeting messages
  offerExamples: string[];     // sample offer headlines
  vectorMotifs: string[];      // motif ideas for vector/illustration style
}

export interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: Subcategory[];
}

// The two reusable content moments (replace the 8 society scenes)
export type ContentMoment = "greeting" | "offer";

// User-facing image styles
export type ImageStyle = "vector" | "real-human" | "festive-decor";

export type CreativeStyle =
  | "realistic"
  | "lifestyle"
  | "graphical"
  | "abstract-3d"
  | "festival-decor"
  | "architectural";

// Creative Recipe — structured data used to assemble the FAL prompt
export interface CreativeRecipe {
  campaign: string;           // what this image communicates emotionally
  mood: string;               // 2-3 mood words
  environment: string;        // picked scene environment description
  subject: string;            // who, max 1-3 people, natural action
  businessCues: string[];     // 2-3 society-specific props/details
  camera: string;             // picked camera style
  lighting: string;           // picked lighting style
  composition: string;        // picked composition rule
  style: string;              // picked visual style
  colorAccent: string;        // brand primary color usage note
  negativeExtra: string[];    // scene-specific things to avoid
  // carry-through for Satori overlay (not sent to FAL)
  brief?: CreativeBrief;
}

// Scene system
export type SceneCategory = "festival" | "offer" | "event" | "awareness";

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
