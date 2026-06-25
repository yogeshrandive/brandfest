import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadScene } from "@/lib/scenes";
import { callCreativeDirector, buildFallbackBrief } from "@/lib/creativeDirector";
import { buildPromptFromBrief } from "@/lib/promptBuilder";
import { generateBackground } from "@/lib/imageAdapter";
import { renderPoster } from "@/lib/render";
import type { BrandConfig, GenerateSceneRequest, PosterSize, VisualStyle, GeneratedPoster } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";
import type { OverlayContent } from "@/lib/render";

export const runtime = "nodejs";
export const maxDuration = 120;

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
  // Festival / greeting scene
  if (inputs.greetingMessage || inputs.festival) {
    return {
      title: inputs.greetingMessage || `Happy ${inputs.festival}!`,
      subtext: inputs.fromName || brand.name,
    };
  }
  // Offer / campaign scene
  return {
    title: inputs.offerTitle || "Special Offer",
    subtext: inputs.offerDescription || inputs.subtext || brand.tagline,
    cta: inputs.cta || undefined,
    validity: inputs.expiryDate ? `Valid until ${inputs.expiryDate}` : undefined,
  };
}

export async function POST(req: NextRequest) {
  let body: GenerateSceneRequest & { referenceImage?: string; referenceStrength?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sceneId, inputs, sizes, visualStyle, referenceImage, referenceStrength } = body;

  if (!sceneId) {
    return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
  }
  if (!sizes || sizes.length === 0) {
    return NextResponse.json({ error: "At least one size must be selected" }, { status: 400 });
  }

  const scene = loadScene(sceneId);
  if (!scene) {
    return NextResponse.json({ error: `Unknown scene: ${sceneId}` }, { status: 400 });
  }

  const missing = scene.inputs
    .filter((i) => i.required && !inputs[i.key])
    .map((i) => i.label);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const brand = loadBrand();
  if (visualStyle) brand.visualStyle = visualStyle as VisualStyle;
  const hasLLM = !!process.env.OPENROUTER_API_KEY;
  const hasFal = !!process.env.FAL_KEY;

  // Stage 1: Creative Director → CreativeBrief
  const brief = hasLLM
    ? await (async () => {
        try {
          return await callCreativeDirector({ scene, inputs, brand, size: sizes[0], visualStyle });
        } catch (err) {
          console.error("[creative-director] LLM failed, using fallback:", err);
          return buildFallbackBrief({ scene, inputs, brand, size: sizes[0] });
        }
      })()
    : buildFallbackBrief({ scene, inputs, brand, size: sizes[0] });

  // Stage 2: Prompt Builder → FAL prompt per size
  const prompts = sizes.map((size: PosterSize) => ({
    size,
    prompt: buildPromptFromBrief(brief, brand, size, (visualStyle as VisualStyle) ?? brand.visualStyle),
  }));

  // Return prompts-only if FAL is not configured
  if (!hasFal) {
    return NextResponse.json({ brief, prompts });
  }

  // Stage 3 & 4: Generate image + render poster per size
  const referenceImageUrl = resolveReferenceImage(referenceImage);
  const overlayContent = buildOverlayContent(inputs, brand);

  const posters: GeneratedPoster[] = await Promise.all(
    prompts.map(async ({ size, prompt }) => {
      const { width, height } = SIZE_CONFIGS[size];

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

      return { size, dataUrl, filename, brief, prompt };
    })
  );

  return NextResponse.json({ brief, prompts, posters });
}
