export type { ChatMessage } from "./openrouter";

export async function callLLM(
  messages: import("./openrouter").ChatMessage[],
  opts?: { model?: string; temperature?: number; max_tokens?: number }
): Promise<string> {
  const provider = process.env.LLM_PROVIDER ?? "openrouter";

  if (provider === "openrouter") {
    const { callOpenRouter } = await import("./openrouter");
    // Model name comes from the caller (UI-managed), not from config.
    // Env LLM_MODEL is only a last-resort default.
    const model = opts?.model ?? process.env.LLM_MODEL ?? "google/gemini-flash-1.5";
    return callOpenRouter({ model, messages, temperature: opts?.temperature, max_tokens: opts?.max_tokens });
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}
