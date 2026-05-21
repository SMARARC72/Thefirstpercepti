/**
 * Phase 21 / OPS-505 — Mistral client.
 *
 * Uses Mistral's REST API (OpenAI-compatible chat completions).
 * Env: MISTRAL_API_KEY (required in production)
 */
import type { LLMClient, LLMRequest, LLMResponse } from "./types.js";
import { LLMClientError } from "./types.js";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export class MistralClient implements LLMClient {
  readonly provider = "mistral";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.MISTRAL_API_KEY ?? "";
    if (!this.apiKey) {
      throw new LLMClientError(
        "MISTRAL_API_KEY missing — set in env or pass to MistralClient(apiKey).",
        "mistral",
      );
    }
  }

  supports(modelId: string): boolean {
    return modelId.startsWith("mistral-");
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

    const res = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;
      throw new LLMClientError(
        `Mistral HTTP ${res.status}: ${text.slice(0, 200)}`,
        "mistral",
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
