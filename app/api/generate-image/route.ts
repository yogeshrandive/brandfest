import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateBackground } from "@/lib/imageAdapter";
import { renderPoster } from "@/lib/render";
import type { BrandConfig, PosterSize, CreativeBrief } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";
import type { OverlayContent } from "@/lib/render";

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

function buildOverlayContent(inputs: Record<string, string>, brand: BrandConfig): OverlayContent {
  if (inputs.greetingMessage || inputs.festival) {
    return {
      title: inputs.greetingMessage || `Happy ${inputs.festival}!`,
      subtext: inputs.fromName || brand.name,
    };
  }
  return {
    title: inputs.offerTitle || "Special Offer",
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

  const { prompt, size, sceneId, inputs, brief, referenceImage, referenceStrength } = body;

  if (!prompt || !size) {
    return NextResponse.json({ error: "prompt and size are required" }, { status: 400 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 503 });
  }

  const brand = loadBrand();
  const { width, height } = SIZE_CONFIGS[size];
  const referenceImageUrl = resolveReferenceImage(referenceImage);
  const overlayContent = buildOverlayContent(inputs, brand);

  const { imageBuffer } = await generateBackground({
    prompt,
    width,
    height,
    referenceImageUrl,
    referenceStrength: referenceStrength ?? 0.15,
  });

  const posterBuffer = await renderPoster(imageBuffer, overlayContent, brand, size);
  const dataUrl = `data:image/png;base64,${posterBuffer.toString("base64")}`;
  const today = new Date().toISOString().split("T")[0];
  const filename = `${brand.name.toLowerCase().replace(/\s+/g, "-")}-${sceneId}-${size}-${today}.png`;

  return NextResponse.json({
    poster: { size, dataUrl, filename, brief, prompt },
  });
}
