import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateBackground } from "@/lib/imageAdapter";
import { renderLogoAndFooter } from "@/lib/render";
import { buildRecipeFromBrief, buildPromptFromRecipe, getModelForStyle } from "@/lib/promptBuilder";
import type { TextOverlayContent } from "@/lib/promptBuilder";
import type { BrandConfig, PosterSize, CreativeBrief, CreativeStyle } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";
import { getDefaultStyle } from "@/lib/styles";

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

function resolveLogoDataUrl(selectedFilename: string | undefined, fallbackPath: string): string | null {
  if (selectedFilename) {
    const p = path.join(ASSETS_DIR, selectedFilename);
    if (fs.existsSync(p)) return fileToDataUrl(p);
  }
  const abs = path.join(process.cwd(), fallbackPath);
  if (fs.existsSync(abs)) return fileToDataUrl(abs);
  return null;
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
  size: PosterSize;
  sceneId: string;
  inputs: Record<string, string>;
  brief?: CreativeBrief;
  creativeStyle?: CreativeStyle;
  selectedLogo?: string;
}

export async function POST(req: NextRequest) {
  let body: GenerateImageRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { size, sceneId, inputs, brief, creativeStyle, selectedLogo } = body;

  if (!size) return NextResponse.json({ error: "size is required" }, { status: 400 });
  if (!brief) return NextResponse.json({ error: "brief is required" }, { status: 400 });
  if (!process.env.FAL_KEY) return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 503 });

  const brand = loadBrand();
  const { width, height } = SIZE_CONFIGS[size];

  const effectiveStyle: CreativeStyle = creativeStyle ?? getDefaultStyle(sceneId);
  const seed = sceneId + size + Date.now().toString(36);
  const recipe = buildRecipeFromBrief(brief, brand, sceneId, size, seed);
  const finalPrompt = buildPromptFromRecipe(recipe, size, effectiveStyle);
  const model = getModelForStyle(effectiveStyle);

  // Stage 1: FAL generates background scene using style-selected model
  const { imageBuffer } = await generateBackground({ prompt: finalPrompt, width, height, model });

  // Stage 2: Satori composites logo (top-left) + text + contact footer
  const textContent = buildTextContent(inputs, brand);
  const logoDataUrl = resolveLogoDataUrl(selectedLogo, brand.logoPath);
  const posterBuffer = await renderLogoAndFooter(imageBuffer, textContent, logoDataUrl, brand, size);

  const dataUrl = `data:image/png;base64,${posterBuffer.toString("base64")}`;
  const today = new Date().toISOString().split("T")[0];
  const filename = `${brand.name.toLowerCase().replace(/\s+/g, "-")}-${sceneId}-${effectiveStyle}-${size}-${today}.png`;

  return NextResponse.json({
    poster: { size, dataUrl, filename, brief, prompt: finalPrompt, creativeStyle: effectiveStyle },
  });
}
