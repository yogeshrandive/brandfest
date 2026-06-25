import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadScene } from "@/lib/scenes";
import { callCreativeDirector, buildFallbackBrief } from "@/lib/creativeDirector";
import { buildPromptFromBrief } from "@/lib/promptBuilder";
// import { generateBackground } from "@/lib/imageAdapter";
// import { renderPoster } from "@/lib/render";
import type { BrandConfig, GenerateSceneRequest, PosterSize, VisualStyle } from "@/lib/types";
// import { SIZE_CONFIGS } from "@/lib/types";

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

function resolveReferenceImage(
  brand: BrandConfig,
  referenceImagePath?: string
): string | null {
  if (referenceImagePath) {
    const url = fileToDataUrl(path.join(ASSETS_DIR, referenceImagePath));
    if (url) return url;
  }
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
  const hasLLM = !!process.env.OPENROUTER_API_KEY;

  // Stage 1: Creative Director → CreativeBrief (one LLM call, shared across all sizes)
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

  // Stage 2: Prompt Builder → FAL prompt per size (image generation skipped for now)
  const prompts = sizes.map((size: PosterSize) => ({
    size,
    prompt: buildPromptFromBrief(brief, brand, size, (visualStyle as VisualStyle) ?? brand.visualStyle),
  }));

  return NextResponse.json({ brief, prompts });
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
