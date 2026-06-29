import { NextRequest, NextResponse } from "next/server";
import { loadIndustry, loadSubcategory } from "@/lib/industries";
import { callCreativeDirector, buildFallbackBrief } from "@/lib/creativeDirector";
import { buildPromptForImageStyle } from "@/lib/promptBuilder";
import type {
  BrandConfig,
  PosterSize,
  ContentMoment,
  ImageStyle,
  SceneInputValues,
  CreativeBrief,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GenerateSceneBody {
  industryId: string;
  subcategoryId: string;
  moment: ContentMoment;
  inputs: SceneInputValues;
  sizes: PosterSize[];
  imageStyle: ImageStyle;
  brand?: BrandConfig;
  models?: string[]; // OpenRouter model ids to compare; [] → single default model
}

interface ModelResult {
  model: string;
  brief?: CreativeBrief;
  prompts?: { size: PosterSize; prompt: string }[];
  error?: string;
}

export async function POST(req: NextRequest) {
  let body: GenerateSceneBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { industryId, subcategoryId, moment, inputs = {}, sizes, imageStyle = "real-human", brand, models } = body;

  if (!industryId || !subcategoryId) {
    return NextResponse.json({ error: "industryId and subcategoryId are required" }, { status: 400 });
  }
  if (!sizes || sizes.length === 0) {
    return NextResponse.json({ error: "At least one size must be selected" }, { status: 400 });
  }

  const industry = loadIndustry(industryId);
  const subcategory = loadSubcategory(industryId, subcategoryId);
  if (!industry || !subcategory) {
    return NextResponse.json({ error: "Unknown industry/subcategory" }, { status: 400 });
  }

  const hasLLM = !!process.env.OPENROUTER_API_KEY;
  const baseSeed = `${industryId}-${subcategoryId}-${Date.now().toString(36)}`;

  // Which models to run. Empty/missing → a single run with the server default.
  const modelList = models && models.length > 0 ? models : [""];

  const buildPrompts = (brief: CreativeBrief) =>
    sizes.map((size) => ({
      size,
      prompt: buildPromptForImageStyle(brief, brand, subcategory, size, imageStyle, baseSeed + size),
    }));

  const results: ModelResult[] = await Promise.all(
    modelList.map(async (model): Promise<ModelResult> => {
      const label = model || "default";
      if (!hasLLM) {
        const brief = buildFallbackBrief({ industry, subcategory, moment, inputs, brand, size: sizes[0], imageStyle });
        return { model: label, brief, prompts: buildPrompts(brief) };
      }
      try {
        const brief = await callCreativeDirector({
          brand, industry, subcategory, moment, inputs, size: sizes[0], imageStyle, model: model || undefined,
        });
        return { model: label, brief, prompts: buildPrompts(brief) };
      } catch (err) {
        console.error(`[creative-director] model ${label} failed:`, err);
        // Fall back so the user still sees a result for this slot.
        const brief = buildFallbackBrief({ industry, subcategory, moment, inputs, brand, size: sizes[0], imageStyle });
        return { model: label, brief, prompts: buildPrompts(brief), error: err instanceof Error ? err.message : "LLM failed" };
      }
    })
  );

  // Back-compat: also expose the first result's brief/prompts at top level.
  const first = results[0];
  return NextResponse.json({ results, brief: first?.brief, prompts: first?.prompts });
}
