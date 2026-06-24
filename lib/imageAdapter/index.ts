export interface GenerateBackgroundOptions {
  prompt: string;
  width: number;
  height: number;
  model?: string;
  referenceImageUrl?: string;   // base64 data URL or https URL
  referenceStrength?: number;   // 0.0–1.0, default 0.15
}

export interface GenerateBackgroundResult {
  imageBuffer: Buffer;
}

export async function generateBackground(
  options: GenerateBackgroundOptions
): Promise<GenerateBackgroundResult> {
  const provider = process.env.IMAGE_PROVIDER ?? "fal";

  if (provider === "fal") {
    const { generateWithFal } = await import("./fal");
    return generateWithFal(options);
  }

  if (provider === "vertex") {
    const { generateWithVertex } = await import("./vertex");
    return generateWithVertex(options);
  }

  if (provider === "openai") {
    const { generateWithOpenAI } = await import("./openai");
    return generateWithOpenAI(options);
  }

  throw new Error(`Unknown IMAGE_PROVIDER: ${provider}`);
}
