import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { callLLM } from "@/lib/llmAdapter";
import type { BrandConfig } from "@/lib/types";

export const runtime = "nodejs";

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");

export async function POST(_req: NextRequest) {
  const brand: BrandConfig = JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));

  const prompt = `You are a brand strategist. Given the business details below, generate three fields as JSON.

Business: ${brand.name}
Industry: ${brand.industry}
Sub-category: ${brand.subCategory}
Description: ${brand.businessDescription ?? ""}
Target audience: ${Array.isArray(brand.targetAudience) ? brand.targetAudience.join(", ") : brand.targetAudience ?? ""}
Brand style: ${brand.brandStyle ?? "Premium"}

Return ONLY valid JSON with these three keys:
{
  "brandSummary": "2-sentence punchy brand summary for a creative brief",
  "visualDirection": "1-sentence art direction note for image generation",
  "industryVisualKeywords": ["keyword1", "keyword2", ...] // 6-8 visual keywords that represent this industry's imagery
}`;

  let enriched: { brandSummary: string; visualDirection: string; industryVisualKeywords: string[] };
  try {
    const raw = await callLLM([{ role: "user", content: prompt }], {
      temperature: 0.7,
      max_tokens: 400,
    });
    // Strip markdown code fences if present
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    enriched = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const updated: BrandConfig = {
    ...brand,
    brandSummary: enriched.brandSummary,
    visualDirection: enriched.visualDirection,
    industryVisualKeywords: enriched.industryVisualKeywords,
  };

  let persisted = false;
  try {
    fs.writeFileSync(BRAND_PATH, JSON.stringify(updated, null, 2) + "\n");
    persisted = true;
  } catch {
    // read-only FS on Vercel
  }

  return NextResponse.json({ brand: updated, persisted });
}
