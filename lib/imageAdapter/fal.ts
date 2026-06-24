import type { GenerateBackgroundOptions, GenerateBackgroundResult } from "./index";

export async function generateWithFal(
  options: GenerateBackgroundOptions
): Promise<GenerateBackgroundResult> {
  const falModule = await import("@fal-ai/serverless-client");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const falClient = (falModule as any).fal ?? falModule.default;

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_KEY env var is not set");

  falClient.config({ credentials: apiKey });

  const model =
    options.model ?? process.env.IMAGE_MODEL ?? "fal-ai/flux-pro/v1.1";

  const aspectRatio =
    options.height > options.width ? "9:16" : "1:1";

  const result = await falClient.subscribe(model, {
    input: {
      prompt: options.prompt,
      image_size: { width: options.width, height: options.height },
      aspect_ratio: aspectRatio,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: "2",
      output_format: "png",
    },
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
