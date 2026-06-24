import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { generateBackground } from "@/lib/imageAdapter";
import { buildPrompt } from "@/lib/prompt";
import { renderPoster } from "@/lib/render";
import type { BrandConfig, Occasion, PosterSize } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function loadBrand(): BrandConfig {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "config", "brand.json"), "utf-8")
  );
}

function loadOccasions(): Occasion[] {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "config", "occasions.json"), "utf-8")
  );
}

export async function GET(req: NextRequest) {
  // Allow manual trigger with a secret; Vercel Cron sends CRON_SECRET in Authorization header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const occasions = loadOccasions();
  const occasion = occasions.find((o) => o.date === today);

  if (!occasion) {
    return NextResponse.json({ message: `No occasion for ${today}` });
  }

  const brand = loadBrand();
  const sizes: PosterSize[] = ["square", "story"];
  const dateStr = today.replace(/-/g, "");

  const results: Array<{ size: PosterSize; url: string }> = [];

  for (const size of sizes) {
    const { width, height } = SIZE_CONFIGS[size];
    const prompt = buildPrompt(occasion, brand, width, height);
    const { imageBuffer } = await generateBackground({ prompt, width, height });

    const content = {
      title: occasion.title,
      subtext: occasion.subtext,
    };

    const pngBuffer = await renderPoster(imageBuffer, content, brand, size);
    const filename = `societybee-${occasion.id}-${size}-${dateStr}.png`;

    const blob = await put(filename, pngBuffer, {
      access: "public",
      contentType: "image/png",
    });

    results.push({ size, url: blob.url });
  }

  return NextResponse.json({ occasion: occasion.id, date: today, results });
}
