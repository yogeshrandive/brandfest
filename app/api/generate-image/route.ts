import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateBackground } from "@/lib/imageAdapter";
import { buildPromptFromBrief } from "@/lib/promptBuilder";
import type { TextOverlayContent } from "@/lib/promptBuilder";
import type { BrandConfig, PosterSize, CreativeBrief, VisualStyle } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");
const ASSETS_DIR = path.join(process.cwd(), "public", "brand");

function loadBrand(): BrandConfig {
  return JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));
}

function fileToDataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function resolveReferenceImage(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) return undefined;
  return fileToDataUrl(filePath);
}

function findLogoFile(): string | undefined {
  if (!fs.existsSync(ASSETS_DIR)) return undefined;
  const files = fs.readdirSync(ASSETS_DIR);
  const logo = files.find((f) => /logo/i.test(f) && /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
  return logo ? path.join(ASSETS_DIR, logo) : undefined;
}

function buildTextContent(inputs: Record<string, string>, brand: BrandConfig): TextOverlayContent {
  if (inputs.greetingMessage || inputs.festival) {
    return {
      headline: inputs.greetingMessage || `Happy ${inputs.festival}!`,
      fromName: inputs.fromName || brand.name,
    };
  }
  return {
    headline: inputs.offerTitle || "Special Offer",
    subtext: inputs.offerDescription || inputs.subtext || brand.tagline,
    cta: inputs.cta || undefined,
    validity: inputs.expiryDate ? `Valid until ${inputs.expiryDate}` : undefined,
  };
}

interface GenerateImageRequest {
  prompt: string;
  size: PosterSize;
  sceneId: string;
  inputs: Record<string, string>;
  brief?: CreativeBrief;
  visualStyle?: string;
  referenceImage?: string;
  referenceStrength?: number;
}

export async function POST(req: NextRequest) {
  let body: GenerateImageRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { size, sceneId, inputs, brief, visualStyle, referenceImage, referenceStrength } = body;

  if (!size) {
    return NextResponse.json({ error: "size is required" }, { status: 400 });
  }
  if (!brief) {
    return NextResponse.json({ error: "brief is required" }, { status: 400 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 503 });
  }

  const brand = loadBrand();
  const { width, height } = SIZE_CONFIGS[size];

  // Resolve reference image: explicit selection takes priority, then auto-detect logo
  const explicitRef = resolveReferenceImage(referenceImage);
  const logoPath = !explicitRef ? findLogoFile() : undefined;
  const referenceImageUrl = explicitRef ?? (logoPath ? fileToDataUrl(logoPath) : undefined);
  const hasLogoReference = !!referenceImageUrl;
  const effectiveStrength = explicitRef ? (referenceStrength ?? 0.15) : 0.08;

  // Build text overlay content from scene inputs
  const textContent = buildTextContent(inputs, brand);

  // Rebuild prompt with text+logo sections embedded
  const finalPrompt = buildPromptFromBrief(
    brief,
    brand,
    size,
    (visualStyle as VisualStyle) ?? brand.visualStyle,
    textContent,
    hasLogoReference
  );

  const { imageBuffer } = await generateBackground({
    prompt: finalPrompt,
    width,
    height,
    referenceImageUrl,
    referenceStrength: effectiveStrength,
  });

  const dataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const today = new Date().toISOString().split("T")[0];
  const filename = `${brand.name.toLowerCase().replace(/\s+/g, "-")}-${sceneId}-${size}-${today}.png`;

  return NextResponse.json({
    poster: { size, dataUrl, filename, brief, prompt: finalPrompt },
  });
}
