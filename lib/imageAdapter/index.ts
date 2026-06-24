export interface GenerateBackgroundOptions {
  prompt: string;
  width: number;
  height: number;
  model?: string;
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
