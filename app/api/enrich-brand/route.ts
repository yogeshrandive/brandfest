import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { callLLM } from "@/lib/llmAdapter";
import type { BrandConfig } from "@/lib/types";

export const runtime = "nodejs";

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");

export async function POST(_req: NextRequest) {
  const brand: BrandConfig = JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));

  const prompt = `You are a brand strategist and creative director for Indian businesses.

Given the business details below, generate brand intelligence as JSON.

Business: ${brand.name}
Industry: ${brand.industry}
Sub-category: ${brand.subCategory}
Description: ${brand.businessDescription ?? ""}
Target audience: ${Array.isArray(brand.targetAudience) ? brand.targetAudience.join(", ") : brand.targetAudience ?? ""}
Brand style: ${brand.brandStyle ?? "Premium"}
Brand voice: ${brand.brandVoice ?? "Professional"}
Primary color: ${brand.colors.primary}
Secondary color: ${brand.colors.secondary}

Return ONLY valid JSON with these keys:
{
  "brandSummary": "2-sentence punchy brand summary for a creative brief",
  "visualDirection": "1-sentence art direction note for image generation",
  "industryVisualKeywords": ["keyword1", "keyword2"],
  "brandVisualDNA": {
    "colorNames": {
      "primary": "friendly name for primary color (e.g. Honey Yellow)",
      "secondary": "friendly name for secondary color (e.g. Dark Charcoal)"
    },
    "patterns": ["brand-specific pattern 1", "pattern 2"],
    "settings": ["typical physical setting 1", "setting 2", "setting 3"],
    "people": ["type of person 1", "type of person 2"],
    "products": ["product/UI description 1", "product/UI description 2"]
  }
}

For brandVisualDNA:
- patterns: visual motifs unique to this brand (e.g. "honeycomb geometric patterns", "medical cross motifs")
- settings: physical environments where this business operates (e.g. "housing society courtyard", "modern apartment lobby")
- people: who appears in this brand's creatives (e.g. "committee members at a meeting table", "residents in a society park")
- products: how the product appears visually (e.g. "mobile app showing maintenance dashboard", "laptop with billing software open")`;

  let enriched: {
    brandSummary: string;
    visualDirection: string;
    industryVisualKeywords: string[];
    brandVisualDNA: {
      colorNames: { primary: string; secondary: string };
      patterns: string[];
      settings: string[];
      people: string[];
      products: string[];
    };
  };

  try {
    const raw = await callLLM([{ role: "user", content: prompt }], {
      temperature: 0.7,
      max_tokens: 600,
    });
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    enriched = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated: BrandConfig & Record<string, any> = {
    ...brand,
    brandSummary: enriched.brandSummary,
    visualDirection: enriched.visualDirection,
    industryVisualKeywords: enriched.industryVisualKeywords,
    brandVisualDNA: enriched.brandVisualDNA,
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
