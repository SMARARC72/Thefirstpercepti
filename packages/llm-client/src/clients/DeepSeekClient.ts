/**
 * Phase 21 / OPS-505 — DeepSeek client.
 *
 * Uses DeepSeek's OpenAI-compatible REST API. Custom fetch (no SDK) to
 * match the existing Anthropic + Kimi pattern in this package.
 *
 * Env: DEEPSEEK_API_KEY (required in production; clients fail-fast if missing)
 */
import type { LLMClient, LLMRequest, LLMResponse } from "./types.js";
import { LLMClientError } from "./types.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export class DeepSeekClient implements LLMClient {
  readonly provider = "deepseek";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
    if (!this.apiKey) {
      throw new LLMClientError(
        "DEEPSEEK_API_KEY missing — set in env or pass to DeepSeekClient(apiKey).",
        "deepseek",
      );
    }
  }

  supports(modelId: string): boolean {
    return modelId === "deepseek-chat" || modelId.startsWith("deepseek-");
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: req.model_id,
      messages: req.system
        ? [{ role: "system", content: req.system }, ...req.messages]
        : req.messages,
      max_tokens: req.max_tokens ?? 4096,
      temperature: req.temperature ?? 0.7,
    };

    if (req.response_format === "json_object") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;
      throw new LLMClientError(
        `DeepSeek HTTP ${res.status}: ${text.slice(0, 200)}`,
        "deepseek",
        res.status,
        retryable,
      );
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model_id: req.model_id,
      tokens_in: data.usage.prompt_tokens,
      tokens_out: data.usage.completion_tokens,
      finish_reason: data.choices[0]?.finish_reason as LLMResponse["finish_reason"],
      raw: data,
    };
  }
}
