import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadScene } from "@/lib/scenes";
import { buildScenePrompt, buildFallbackPrompt } from "@/lib/promptEngine";
import { generateBackground } from "@/lib/imageAdapter";
import { renderPoster } from "@/lib/render";
import type { BrandConfig, GenerateSceneRequest, PosterSize, VisualStyle } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");
const ASSETS_DIR = path.join(process.cwd(), "public", "brand");

function loadBrand(): BrandConfig {
  return JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));
}

function fileToDataUrl(filePath: string): string | null {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// Pick the best reference image: explicit reference > logo
function resolveReferenceImage(
  brand: BrandConfig,
  referenceImagePath?: string
): string | null {
  if (referenceImagePath) {
    const url = fileToDataUrl(path.join(ASSETS_DIR, referenceImagePath));
    if (url) return url;
  }
  // Fall back to logo
  return fileToDataUrl(brand.logoPath);
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
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const hasLLM = !!process.env.OPENROUTER_API_KEY;

  const referenceImageUrl = resolveReferenceImage(brand, referenceImage) ?? undefined;
  const overlayContent = buildOverlayContent(sceneId, inputs, brand);

  try {
    const posters = await Promise.all(
      sizes.map(async (size: PosterSize) => {
        const { width, height } = SIZE_CONFIGS[size];

        let imagePrompt: string;
        if (hasLLM) {
          imagePrompt = await buildScenePrompt({ scene, inputs, brand, size, visualStyle });
        } else {
          imagePrompt = buildFallbackPrompt(inputs, brand, size, visualStyle);
        }

        const { imageBuffer } = await generateBackground({
          prompt: imagePrompt,
          width,
          height,
          referenceImageUrl,
          referenceStrength: referenceStrength ?? 0.15,
        });

        const pngBuffer = await renderPoster(imageBuffer, overlayContent, brand, size);
        const filename = `${brand.name.toLowerCase().replace(/\s+/g, "-")}-${sceneId}-${size}-${today}.png`;
        const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

        return { size, dataUrl, filename, prompt: hasLLM ? imagePrompt : undefined };
      })
    );

    return NextResponse.json({ posters });
  } catch (err) {
    console.error("[generate-scene] Error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildOverlayContent(
  sceneId: string,
  inputs: Record<string, string>,
  brand: BrandConfig
) {
  if (sceneId === "festival-greeting") {
    return {
      title: inputs.festival ? `Happy ${inputs.festival}` : brand.name,
      subtext: inputs.greetingMessage ?? "",
      cta: undefined,
      validity: undefined,
    };
  }

  if (sceneId === "offer-campaign") {
    let validity: string | undefined;
    if (inputs.expiryDate) {
      validity = `Valid until ${new Date(inputs.expiryDate).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })}`;
    } else if (inputs.urgency && inputs.urgency !== "None") {
      validity = inputs.urgency === "Limited Time" ? "Limited Time Offer" : inputs.urgency;
    }
    return {
      title: inputs.offerTitle ?? "",
      subtext: inputs.offerDescription ?? "",
      cta: inputs.cta,
      validity,
    };
  }

  return {
    title: brand.name,
    subtext: brand.tagline ?? "",
    cta: undefined,
    validity: undefined,
  };
}
