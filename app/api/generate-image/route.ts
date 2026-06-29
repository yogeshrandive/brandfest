import { NextRequest, NextResponse } from "next/server";
import { generateBackground } from "@/lib/imageAdapter";
import { renderLogoAndFooter } from "@/lib/render";
import { buildRecipeFromBrief, buildPromptFromRecipe, getModelForImageStyle, IMAGE_STYLE_TO_CREATIVE } from "@/lib/promptBuilder";
import type { TextOverlayContent } from "@/lib/promptBuilder";
import { loadSubcategory } from "@/lib/industries";
import type { BrandConfig, PosterSize, CreativeBrief, ImageStyle, ContentMoment, SceneInputValues } from "@/lib/types";
import { SIZE_CONFIGS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface GenerateImageBody {
  size: PosterSize;
  industryId: string;
  subcategoryId: string;
  moment: ContentMoment;
  inputs: SceneInputValues;
  brief: CreativeBrief;
  imageStyle?: ImageStyle;
  brand?: BrandConfig;
  logoDataUrl?: string | null;
}

function buildTextContent(moment: ContentMoment, inputs: SceneInputValues, brand?: BrandConfig): TextOverlayContent {
  if (moment === "greeting") {
    return {
      headline: inputs.greetingMessage || (inputs.festival ? `Happy ${inputs.festival}!` : "Warm Wishes"),
      fromName: inputs.fromName || brand?.name || undefined,
    };
  }
  return {
    headline: inputs.offerTitle || "Special Offer",
    subtext: inputs.offerDescription || inputs.subtext || brand?.tagline || undefined,
    cta: inputs.cta || undefined,
    validity: inputs.expiryDate ? `Valid until ${inputs.expiryDate}` : undefined,
  };
}

export async function POST(req: NextRequest) {
  let body: GenerateImageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { size, industryId, subcategoryId, moment, inputs = {}, brief, imageStyle = "real-human", brand, logoDataUrl } = body;

  if (!size) return NextResponse.json({ error: "size is required" }, { status: 400 });
  if (!brief) return NextResponse.json({ error: "brief is required" }, { status: 400 });
  if (!process.env.FAL_KEY) return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 503 });

  const { width, height } = SIZE_CONFIGS[size];
  const subcategory = subcategoryId ? loadSubcategory(industryId, subcategoryId) ?? undefined : undefined;

  const seed = `${industryId}-${subcategoryId}-${size}-${Date.now().toString(36)}`;
  const recipe = buildRecipeFromBrief(brief, brand, subcategory, size, seed);
  const finalPrompt = buildPromptFromRecipe(recipe, size, IMAGE_STYLE_TO_CREATIVE[imageStyle] ?? "lifestyle");
  const model = getModelForImageStyle(imageStyle);

  // Stage 1: FAL generates the background art using the style-selected model
  const { imageBuffer } = await generateBackground({ prompt: finalPrompt, width, height, model });

  // Stage 2: Satori composites logo + text + contact footer into the reserved space
  const textContent = buildTextContent(moment, inputs, brand);
  const posterBuffer = await renderLogoAndFooter(imageBuffer, textContent, logoDataUrl ?? null, brand, size, brief.logoSpec);

  const dataUrl = `data:image/png;base64,${posterBuffer.toString("base64")}`;
  const today = new Date().toISOString().split("T")[0];
  const brandSlug = (brand?.name || "brandfest").toLowerCase().replace(/\s+/g, "-");
  const filename = `${brandSlug}-${subcategoryId || moment}-${imageStyle}-${size}-${today}.png`;

  return NextResponse.json({
    poster: { size, dataUrl, filename, brief, prompt: finalPrompt, imageStyle },
  });
}
