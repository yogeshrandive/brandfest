import type { CreativeBrief, BrandConfig, PosterSize, VisualStyle } from "./types";
import { VISUAL_TEMPLATES } from "./templates";

// ─── Section builders ─────────────────────────────────────────────────────────

function RoleSection(): string {
  return `ROLE
You are an Art Director commissioning premium commercial advertising background artwork.

Your job is NOT to design a finished poster.
Your job is to specify hero background artwork that allows designers to place logo, typography, and CTA on top afterwards.

Every composition must contain clean negative space reserved for branding elements.
The image succeeds when it communicates premium quality and trustworthiness through environment and atmosphere alone — without any visible text.`;
}

function CampaignGoalSection(brief: CreativeBrief): string {
  return `CAMPAIGN GOAL
${brief.goal}

Emotional Direction: ${brief.emotions?.join(", ") ?? brief.mood}

Design Intent: ${brief.designIntent?.join(", ") ?? "Professional, Premium, Trustworthy, Modern"}

This image will serve as a background for a corporate marketing creative. Text, logo, and CTA will be composited on top by the design system — they must NOT appear in this artwork.`;
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

  const domains = (brand as unknown as Record<string, unknown>).businessDomain as string[] | undefined;
  const domainStr = domains?.join(", ") ?? brand.subCategory ?? brand.industry;

  return `BRAND IDENTITY
Business: ${brand.name}
Business Domain: ${domainStr}
Primary Color: ${primaryLabel}
Secondary Color: ${secondaryLabel}
Accent: ${brand.colors.accent}

Do NOT depict product UI, software dashboards, or application screens. Communicate the business domain through environment, people, and atmosphere only.`;
}

function EnvironmentSection(brief: CreativeBrief): string {
  const cues = brief.businessRelevanceCues?.length
    ? `\nBusiness Environment Cues: ${brief.businessRelevanceCues.join(", ")}`
    : "";
  return `ENVIRONMENT
${brief.scene}${cues}

Emphasize: architecture, materials, textures, natural light, spatial depth.
Avoid: empty white walls, plain office cubicles, generic co-working spaces.`;
}

function SubjectSection(brief: CreativeBrief): string {
  return `SUBJECT
${brief.subject}

Technology is implied — not shown. If a laptop is present: open, screen softly blurred, no readable interface. No UI screenshots.`;
}

function CompositionSection(brief: CreativeBrief, size: PosterSize): string {
  const formatNote = size === "story"
    ? "Vertical 9:16 portrait format. Main subject upper 60% of frame."
    : "Square 1:1 format. Main subject center or right-weighted.";

  const reservedNote = brief.reservedAreas
    .map((a) => `${a.position} ${a.percentage}%: reserved for ${a.purpose} — must be smooth, dark, and uncluttered.`)
    .join("\n");

  const safeZone = brief.typographySafeZone
    ? `\nTypography Safe Zone: ${brief.typographySafeZone}\nThis zone must support white typography. No faces, no bright highlights, no color splashes. Create a natural gradient to dark if needed.`
    : "";

  return `COMPOSITION
${formatNote}

${brief.composition}

Reserved Zones (critical — typography and logo will be placed here):
${reservedNote}${safeZone}`;
}

function VisualHierarchySection(brief: CreativeBrief): string {
  const hierarchy = brief.visualHierarchy?.length
    ? brief.visualHierarchy.map((item, i) => `${i + 1}. ${item}`).join("\n")
    : `1. People collaborating naturally\n2. Premium environment / workspace\n3. Residential or commercial architecture\n4. Subtle technology cues\n5. Decorative atmospheric elements`;

  return `VISUAL HIERARCHY
Direct viewer attention in this priority order:
${hierarchy}`;
}

function CameraSection(brief: CreativeBrief): string {
  const camera = brief.cameraDirection ?? "Eye-level, 35mm lens, natural depth of field, wide composition";
  return `CAMERA
${camera}`;
}

function LightingSection(brief: CreativeBrief): string {
  return `LIGHTING
${brief.lighting}`;
}

function BackgroundQualitySection(brief: CreativeBrief): string {
  const quality = brief.backgroundQuality ?? "Luxury architecture, soft depth of field, natural materials, premium finish";
  return `BACKGROUND QUALITY
${quality}
High dynamic range. Natural materials. Rich textures. Soft bokeh in distance.
Professional advertising photography standard. Luxury commercial finish.`;
}

function StyleSection(brief: CreativeBrief, visualStyle: VisualStyle): string {
  const template = VISUAL_TEMPLATES[visualStyle as keyof typeof VISUAL_TEMPLATES];
  const styleModifiers = template?.promptModifiers ?? "";

  return `STYLE
Design language: Premium SaaS — Apple, Linear, Notion, Stripe.
Minimal, modern, clean. Corporate without being cold.
${brief.backgroundStyle}. ${styleModifiers}
Color Directive: ${brief.colorDirective}
Visual Keywords: ${brief.visualKeywords.join(", ")}`;
}

function NegativeSection(brief: CreativeBrief): string {
  const defaults = [
    "text", "letters", "words", "typography", "watermarks",
    "logos", "UI overlays", "speech bubbles", "chat interfaces",
    "dashboard screens", "application screenshots", "readable laptop screens",
    "color hex codes", "error messages", "notifications",
  ];
  const combined = [...new Set([...defaults, ...brief.negativeElements])];

  return `NEGATIVE
No: ${combined.join(", ")}.
No stock-photo look. No cartoon, illustration, or flat design.
No distorted anatomy, extra fingers, blurry faces, malformed hands.
No floating objects, random background clutter, exaggerated expressions.
No cropped heads, no clipping at frame edges.
No obviously staged poses — candid and natural only.`;
}

function QualitySection(): string {
  return `QUALITY
Photorealistic commercial advertising photography.
High dynamic range. Natural depth of field. Premium lifestyle imagery.
LinkedIn and Instagram optimized. Luxury commercial grade finish.`;
}

export interface TextOverlayContent {
  headline: string;
  subtext?: string;
  cta?: string;
  validity?: string;
  fromName?: string;
}

// ─── Main assembler ───────────────────────────────────────────────────────────

export function buildPromptFromBrief(
  brief: CreativeBrief,
  brand: BrandConfig,
  size: PosterSize,
  visualStyle: VisualStyle,
): string {
  const sections = [
    RoleSection(),
    CampaignGoalSection(brief),
    BrandIdentitySection(brand),
    EnvironmentSection(brief),
    SubjectSection(brief),
    CompositionSection(brief, size),
    VisualHierarchySection(brief),
    CameraSection(brief),
    LightingSection(brief),
    BackgroundQualitySection(brief),
    StyleSection(brief, visualStyle),
    NegativeSection(brief),
    QualitySection(),
  ];

  return sections.join("\n\n");
}
