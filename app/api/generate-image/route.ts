import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateBackground } from "@/lib/imageAdapter";
import { renderLogoAndFooter } from "@/lib/render";
import { buildPromptFromBrief } from "@/lib/promptBuilder";
import type { TextOverlayContent } from "@/lib/promptBuilder";
import type { BrandConfig, PosterSize, CreativeBrief, VisualStyle } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");

function loadBrand(): BrandConfig {
  return JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));
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
  visualStyle?: string;
}

export async function POST(req: NextRequest) {
  let body: GenerateImageRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { size, sceneId, inputs, brief, visualStyle } = body;

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

  // Build text content from scene inputs, embed into FAL prompt
  const textContent = buildTextContent(inputs, brand);
  const finalPrompt = buildPromptFromBrief(
    brief,
    brand,
    size,
    (visualStyle as VisualStyle) ?? brand.visualStyle,
    textContent,
  );

  // Stage 1: FAL generates background + text
  const { imageBuffer } = await generateBackground({
    prompt: finalPrompt,
    width,
    height,
  });

  // Stage 2: Satori composites logo (top-left) + contact footer (bottom) over FAL output
  const posterBuffer = await renderLogoAndFooter(imageBuffer, brand, size);

  const dataUrl = `data:image/png;base64,${posterBuffer.toString("base64")}`;
  const today = new Date().toISOString().split("T")[0];
  const filename = `${brand.name.toLowerCase().replace(/\s+/g, "-")}-${sceneId}-${size}-${today}.png`;

  return NextResponse.json({
    poster: { size, dataUrl, filename, brief, prompt: finalPrompt },
  });
}
