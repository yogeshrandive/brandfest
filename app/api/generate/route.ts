import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateBackground } from "@/lib/imageAdapter";
import { buildPrompt } from "@/lib/prompt";
import { renderPoster } from "@/lib/render";
import type { BrandConfig, Occasion, OfferInput, PosterSize, PosterRequest, VisualStyle } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function loadBrand(): BrandConfig {
  const p = path.join(process.cwd(), "config", "brand.json");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export async function POST(req: NextRequest) {
  let body: PosterRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode, occasion, offer, sizes, visualStyle } = body;

  if (!sizes || sizes.length === 0) {
    return NextResponse.json({ error: "At least one size must be selected" }, { status: 400 });
  }

  const source: Occasion | OfferInput | undefined =
    mode === "occasion" ? occasion : offer;

  if (!source) {
    return NextResponse.json(
      { error: `Missing ${mode} data` },
      { status: 400 }
    );
  }

  const brand = loadBrand();
  if (visualStyle) brand.visualStyle = visualStyle as VisualStyle;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  try {
    // Generate one background per size (different aspect ratios)
    const posters = await Promise.all(
      sizes.map(async (size: PosterSize) => {
        const { width, height } = SIZE_CONFIGS[size];
        const prompt = buildPrompt(source, brand, width, height);

        const { imageBuffer } = await generateBackground({ prompt, width, height });

        const content = {
          title: "title" in source ? source.title : (source as OfferInput).headline,
          subtext: source.subtext,
          cta: "cta" in source ? source.cta : undefined,
          validity: "validity" in source ? source.validity : undefined,
        };

        const pngBuffer = await renderPoster(imageBuffer, content, brand, size);

        const id = "id" in source ? source.id : "offer";
        const filename = `societybee-${id}-${size}-${today}.png`;
        const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

        return { size, dataUrl, filename };
      })
    );

    return NextResponse.json({ posters });
  } catch (err) {
    console.error("[generate] Error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
