/**
 * Phase 22.6 — OpenAI client.
 *
 * Uses OpenAI's chat completions REST API. Custom fetch (no SDK) to match
 * the existing DeepSeek/Mistral/Anthropic/Kimi pattern in this package.
 * Implements the new Phase 21 LLMClient interface directly (no adapter
 * needed) — same shape as DeepSeekClient.
 *
 * Env: OPENAI_API_KEY (or any case variant + OPEN_API_KEY alias — see
 * findEnvVar in ClientRegistry.ts). Required in production.
 */
import type { LLMClient, LLMRequest, LLMResponse } from "./types.js";
import { LLMClientError } from "./types.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIClient implements LLMClient {
  readonly provider = "openai";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ??
      process.env.OPENAI_API_KEY ??
      process.env.OPEN_API_KEY ??
      "";
    if (!this.apiKey) {
      throw new LLMClientError(
        "OPENAI_API_KEY missing — set in env or pass to OpenAIClient(apiKey).",
        "openai",
      );
    }
  }

  supports(modelId: string): boolean {
    return modelId.startsWith("gpt-") || modelId.startsWith("o1-") || modelId.startsWith("o3-");
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

    const res = await fetch(OPENAI_API_URL, {
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
        `OpenAI HTTP ${res.status}: ${text.slice(0, 200)}`,
        "openai",
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
