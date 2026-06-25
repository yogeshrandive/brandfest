import type { GenerateBackgroundOptions, GenerateBackgroundResult } from "./index";

const RECRAFT_MODELS = new Set(["fal-ai/recraft-v3", "fal-ai/recraft-v3-svg"]);

export async function generateWithFal(
  options: GenerateBackgroundOptions
): Promise<GenerateBackgroundResult> {
  const falModule = await import("@fal-ai/serverless-client");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const falClient = (falModule as any).fal ?? falModule.default;

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_KEY env var is not set");

  falClient.config({ credentials: apiKey });

  const hasReference = !!options.referenceImageUrl;
  const model =
    options.model ??
    process.env.IMAGE_MODEL ??
    (hasReference ? "fal-ai/flux-pro/v1.1-ultra" : "fal-ai/flux-pro/v1.1");

  const aspectRatio = options.height > options.width ? "9:16" : "1:1";
  const isRecraft = RECRAFT_MODELS.has(model);

  let input: Record<string, unknown>;

  if (isRecraft) {
    // recraft-v3 uses different param names and style enum
    input = {
      prompt: options.prompt,
      image_size: { width: options.width, height: options.height },
      style: "realistic_image",   // recraft style: realistic_image | digital_illustration | vector_illustration | ...
      num_images: 1,
      output_format: "png",
    };
  } else {
    // flux-pro models
    input = {
      prompt: options.prompt,
      image_size: { width: options.width, height: options.height },
      aspect_ratio: aspectRatio,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: "2",
      output_format: "png",
    };

    if (hasReference) {
      input.image_url = options.referenceImageUrl;
      input.image_prompt_strength = options.referenceStrength ?? 0.15;
    }
  }

  const result = await falClient.subscribe(model, {
    input,
    pollInterval: 2000,
    logs: false,
  }) as { images?: Array<{ url: string }> };

  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) throw new Error("Fal.ai returned no image URL");

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  return { imageBuffer: Buffer.from(arrayBuffer) };
}
