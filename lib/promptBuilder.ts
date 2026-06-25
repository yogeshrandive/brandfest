import type { CreativeBrief, BrandConfig, PosterSize, VisualStyle } from "./types";
import { VISUAL_TEMPLATES } from "./templates";

// ─── Section builders ─────────────────────────────────────────────────────

function RoleSection(): string {
  return `ROLE
You are a Senior Creative Director and Brand Designer at a global advertising agency specializing in premium SaaS and corporate marketing campaigns for Indian businesses.
Your expertise spans commercial advertising, brand identity design, typography-aware composition, social media creatives, and corporate visual storytelling.`;
}

function CampaignGoalSection(brief: CreativeBrief): string {
  return `CAMPAIGN GOAL
${brief.goal}
The final artwork will be used as the background of a branded marketing creative with text overlay and logo.
It must leave clean, smooth space for logo, headline, and call-to-action.

Emotional Direction: ${brief.emotions?.join(", ") ?? brief.mood}`;
}

function BrandIdentitySection(brand: BrandConfig): string {
  const dna = (brand as unknown as Record<string, unknown>).brandVisualDNA as {
    colorNames?: { primary?: string; secondary?: string };
  } | undefined;

  const primaryLabel = dna?.colorNames?.primary
    ? `${brand.colors.primary} (${dna.colorNames.primary})`
    : brand.colors.primary;
  const secondaryLabel = dna?.colorNames?.secondary
    ? `${brand.colors.secondary} (${dna.colorNames.secondary})`
    : brand.colors.secondary;

  const personality = [
    brand.brandStyle,
    brand.brandVoice,
    "Trustworthy",
    "Modern Indian",
    "Technology-forward",
  ].filter(Boolean).join(", ");

  return `BRAND IDENTITY
Business: ${brand.name}
Industry: ${brand.subCategory || brand.industry}
Brand Personality: ${personality}
Primary Color: ${primaryLabel}
Secondary Color: ${secondaryLabel}
Accent Color: ${brand.colors.accent}`;
}

function SceneSection(brief: CreativeBrief): string {
  const cues = brief.businessRelevanceCues?.length
    ? `\nBusiness Visual Cues: ${brief.businessRelevanceCues.join(", ")}`
    : "";
  return `SCENE
${brief.scene}${cues}`;
}

function SubjectSection(brief: CreativeBrief): string {
  return `SUBJECT
${brief.subject}`;
}

function CompositionSection(brief: CreativeBrief, size: PosterSize): string {
  const formatNote = size === "story"
    ? "Vertical 9:16 portrait format."
    : "Square 1:1 format.";

  const reservedNote = brief.reservedAreas
    .map((a) => `Reserve ${a.percentage}% ${a.position} for ${a.purpose}.`)
    .join(" ");

  const safeZone = brief.typographySafeZone
    ? `\nTypography Safe Zone: ${brief.typographySafeZone}`
    : "";

  return `COMPOSITION
${formatNote}
${brief.composition}
${reservedNote}
No important visual element inside reserved areas.${safeZone}`;
}

function CameraSection(brief: CreativeBrief): string {
  const camera = brief.cameraDirection ?? "Eye-level shot, 35mm lens, natural depth of field, wide composition, balanced perspective";
  return `CAMERA
${camera}`;
}

function BrandPlacementSection(brief: CreativeBrief): string {
  const placement = brief.brandPlacement ?? "Logo top-left corner, 8% image width, clear margin, dark uncluttered background";
  return `BRAND PLACEMENT
${placement}
No competing visual element near logo zone. High contrast background behind logo area.`;
}

function LightingSection(brief: CreativeBrief): string {
  return `LIGHTING
${brief.lighting}`;
}

function StyleSection(brief: CreativeBrief, visualStyle: VisualStyle): string {
  const template = VISUAL_TEMPLATES[visualStyle as keyof typeof VISUAL_TEMPLATES];
  const styleModifiers = template?.promptModifiers ?? "";

  return `STYLE
Inspired by: Apple, Airbnb, Stripe, Adobe Express — premium corporate branding aesthetic.
${brief.backgroundStyle}. ${styleModifiers}
Color Directive: ${brief.colorDirective}
Visual Keywords: ${brief.visualKeywords.join(", ")}`;
}

function NegativeSection(brief: CreativeBrief): string {
  const defaults = [
    "text", "letters", "words", "watermarks", "logos",
    "UI overlays", "speech bubbles",
  ];
  const combined = [...new Set([...defaults, ...brief.negativeElements])];

  return `NEGATIVE
No: ${combined.join(", ")}.
No stock-photo look. No cartoon or illustration style.
No distorted anatomy, extra fingers, blurry faces, malformed hands, duplicated people.
No floating objects, random background elements, exaggerated expressions.
No cropped heads, no clipping at frame edges.`;
}

function QualitySection(): string {
  return `QUALITY
Photorealistic. Commercial advertising quality.
Natural depth of field. Premium lifestyle photography.
LinkedIn and WhatsApp optimized. Print-ready resolution.`;
}

// ─── Main assembler ─────────────────────────────────────────────────────

export function buildPromptFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig,
  size: PosterSize,
  visualStyle: VisualStyle
): string {
  return [
    RoleSection(),
    CampaignGoalSection(brief),
    BrandIdentitySection(brand),
    SceneSection(brief),
    SubjectSection(brief),
    CompositionSection(brief, size),
    CameraSection(brief),
    BrandPlacementSection(brief),
    LightingSection(brief),
    StyleSection(brief, visualStyle),
    NegativeSection(brief),
    QualitySection(),
  ].join("\n\n");
}
