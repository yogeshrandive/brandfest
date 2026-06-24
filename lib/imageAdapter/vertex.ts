import type { GenerateBackgroundOptions, GenerateBackgroundResult } from "./index";

export async function generateWithVertex(
  options: GenerateBackgroundOptions
): Promise<GenerateBackgroundResult> {
  // Google Imagen 4 via Vertex AI
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION ?? "us-central1";
  const model = options.model ?? process.env.IMAGE_MODEL ?? "imagen-4.0-generate-preview-06-06";

  if (!projectId) throw new Error("GCP_PROJECT_ID env var is not set");

  // Dynamic require to avoid bundling issues when package is not installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GoogleAuth: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ GoogleAuth } = require("google-auth-library"));
  } catch {
    throw new Error("google-auth-library is not installed. Run: npm install google-auth-library");
  }
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const aspectRatio = options.height > options.width ? "9:16" : "1:1";

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

  const body = {
    instances: [{ prompt: options.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio,
      negativePrompt: "text, letters, words, watermark, logo, caption, numbers",
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex AI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded: string }>;
  };

  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Vertex AI returned no image data");

  return { imageBuffer: Buffer.from(b64, "base64") };
}
