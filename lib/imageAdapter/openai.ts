import type { GenerateBackgroundOptions, GenerateBackgroundResult } from "./index";

export async function generateWithOpenAI(
  options: GenerateBackgroundOptions
): Promise<GenerateBackgroundResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY env var is not set");

  const model = options.model ?? process.env.IMAGE_MODEL ?? "gpt-image-1";

  const isStory = options.height > options.width;
  const size = isStory ? "1024x1792" : "1024x1024";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      n: 1,
      size,
      quality: "high",
      output_format: "png",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");

  return { imageBuffer: Buffer.from(b64, "base64") };
}
