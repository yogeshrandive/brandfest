import type { CreativeBrief, BrandConfig, PosterSize, VisualStyle } from "./types";
import { VISUAL_TEMPLATES } from "./templates";

function RoleSection(): string {
  return `ROLE
You are an award-winning commercial advertising photographer and digital artist specialising in premium B2B SaaS marketing creatives for Indian businesses.`;
}

function GoalSection(brief: CreativeBrief): string {
  return `GOAL
${brief.goal}

Mood: ${brief.mood}`;
}

function BrandSection(brand: BrandConfig): string {
  const dna = (brand as unknown as Record<string, unknown>).brandVisualDNA as {
    colorNames?: { primary?: string; secondary?: string };
  } | undefined;

  const primaryLabel = dna?.colorNames?.primary
    ? `${brand.colors.primary} (${dna.colorNames.primary})`
    : brand.colors.primary;
  const secondaryLabel = dna?.colorNames?.secondary
    ? `${brand.colors.secondary} (${dna.colorNames.secondary})`
    : brand.colors.secondary;

  return `BRAND
Business: ${brand.name}
Industry: ${brand.subCategory || brand.industry}
Primary Color: ${primaryLabel}
Secondary Color: ${secondaryLabel}
Accent Color: ${brand.colors.accent}`;
}

function SceneSection(brief: CreativeBrief): string {
  return `SCENE
${brief.scene}`;
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
    .map((a) => `Reserve ${a.percentage}% ${a.position} area for ${a.purpose}.`)
    .join(" ");

  return `COMPOSITION
${formatNote} ${brief.composition}. ${reservedNote} No important visual element inside reserved areas.`;
}

function LightingSection(brief: CreativeBrief): string {
  return `LIGHTING
${brief.lighting}`;
}

function StyleSection(brief: CreativeBrief, visualStyle: VisualStyle): string {
  const template = VISUAL_TEMPLATES[visualStyle as keyof typeof VISUAL_TEMPLATES];
  const styleNotes = template?.promptModifiers ?? "";

  return `STYLE
${brief.backgroundStyle}. ${styleNotes}
Color Directive: ${brief.colorDirective}
Visual Keywords: ${brief.visualKeywords.join(", ")}`;
}

function NegativeSection(brief: CreativeBrief): string {
  const defaults = ["text", "letters", "words", "watermarks", "logos", "UI overlays in background"];
  const combined = [...new Set([...defaults, ...brief.negativeElements])];

  return `NEGATIVE
No: ${combined.join(", ")}.
No stock-photo look. No cartoon or illustration style. No distorted anatomy.`;
}

function QualitySection(): string {
  return `QUALITY
Photorealistic. 8K resolution. Award-winning commercial photography. Premium SaaS marketing quality. LinkedIn and WhatsApp ready.`;
}

export function buildPromptFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig,
  size: PosterSize,
  visualStyle: VisualStyle
): string {
  return [
    RoleSection(),
    GoalSection(brief),
    BrandSection(brand),
    SceneSection(brief),
    SubjectSection(brief),
    CompositionSection(brief, size),
    LightingSection(brief),
    StyleSection(brief, visualStyle),
    NegativeSection(brief),
    QualitySection(),
  ].join("\n\n");
}
