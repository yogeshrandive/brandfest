export interface BrandConfig {
  name: string;
  logoPath: string;
  colors: { primary: string; secondary: string; accent: string };
  contact: { phone: string; website: string; handle: string };
  tagline: string;
  footerNote: string;
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

export type PosterMode = "occasion" | "offer";

export interface PosterRequest {
  mode: PosterMode;
  occasion?: Occasion;
  offer?: OfferInput;
  sizes: PosterSize[];
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
}

export interface GenerateResponse {
  posters: GeneratedPoster[];
}
