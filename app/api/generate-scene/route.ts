import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadScene } from "@/lib/scenes";
import { callCreativeDirector, buildFallbackBrief } from "@/lib/creativeDirector";
import { buildPromptFromBrief } from "@/lib/promptBuilder";
import type { BrandConfig, GenerateSceneRequest, PosterSize, VisualStyle } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");

function loadBrand(): BrandConfig {
  return JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));
}

export async function POST(req: NextRequest) {
  let body: GenerateSceneRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sceneId, inputs, sizes, visualStyle } = body;

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

  // Stage 2: Prompt Builder → prompt per size
  const prompts = sizes.map((size: PosterSize) => ({
    size,
    prompt: buildPromptFromBrief(brief, brand, size, (visualStyle as VisualStyle) ?? brand.visualStyle),
  }));

  return NextResponse.json({ brief, prompts });
}
