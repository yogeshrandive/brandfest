export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export async function callOpenRouter(options: OpenRouterOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = options.model || process.env.LLM_MODEL || "google/gemini-flash-1.5";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://brandfest.app",
      "X-Title": "BrandFest Poster Generator",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.max_tokens ?? 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}
