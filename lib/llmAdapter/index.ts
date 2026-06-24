export type { ChatMessage } from "./openrouter";

export async function callLLM(
  messages: import("./openrouter").ChatMessage[],
  opts?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const provider = process.env.LLM_PROVIDER ?? "openrouter";

  if (provider === "openrouter") {
    const { callOpenRouter } = await import("./openrouter");
    const model = process.env.LLM_MODEL ?? "google/gemini-flash-1.5";
    return callOpenRouter({ model, messages, ...opts });
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}
