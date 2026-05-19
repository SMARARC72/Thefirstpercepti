import type {
  PromptTemplate,
  LLMRequest,
  LLMMessage,
  PromptBuilderOptions,
  ModelTier,
} from "./types.js";
import { MODELS } from "./types.js";

const DEFAULT_MAX_CONTEXT = 12000;

export class PromptBuilder {
  private options: PromptBuilderOptions;

  constructor(options: PromptBuilderOptions = {}) {
    this.options = {
      maxContextTokens: options.maxContextTokens ?? DEFAULT_MAX_CONTEXT,
      truncationStrategy: options.truncationStrategy ?? "middle",
    };
  }

  /**
   * Build an LLMRequest from a typed template and context.
   */
  build<Context, Output>(
    template: PromptTemplate<Context, Output>,
    context: Context
  ): LLMRequest {
    const userPrompt = template.buildUserPrompt(context);
    const model = MODELS[template.model];

    const messages: LLMMessage[] = [
      { role: "system", content: template.systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // If the user prompt exceeds the context window, truncate
    const estimatedTokens = this._estimateTokens(
      template.systemPrompt + userPrompt
    );
    if (estimatedTokens > this.options.maxContextTokens!) {
      const truncated = this._truncate(
        userPrompt,
        this.options.maxContextTokens! - this._estimateTokens(template.systemPrompt)
      );
      messages[1].content = truncated;
    }

    const req: LLMRequest = {
      model: model.id,
      messages,
      temperature: template.temperature,
      max_tokens: template.maxTokens,
    };

    // If output schema expects structured data, use JSON mode
    if (template.outputSchema.description.includes("JSON")) {
      req.response_format = { type: "json_object" };
    }

    return req;
  }

  /**
   * Build a simple chat request without a template.
   */
  buildSimple(options: {
    system: string;
    user: string;
    model?: ModelTier;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): LLMRequest {
    const tier = MODELS[options.model ?? "balanced"];

    let userContent = options.user;
    const estimatedTokens = this._estimateTokens(options.system + userContent);
    if (estimatedTokens > this.options.maxContextTokens!) {
      userContent = this._truncate(
        userContent,
        this.options.maxContextTokens! - this._estimateTokens(options.system)
      );
    }

    const req: LLMRequest = {
      model: tier.id,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: userContent },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
    };
    if (options.jsonMode) {
      req.response_format = { type: "json_object" };
    }
    return req;
  }

  /**
   * Rough token estimation: ~4 characters per token for English/Chinese mixed.
   */
  private _estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private _truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;

    switch (this.options.truncationStrategy) {
      case "head":
        return "..." + text.slice(-maxChars + 3);
      case "tail":
        return text.slice(0, maxChars - 3) + "...";
      case "middle": {
        const keep = Math.floor((maxChars - 5) / 2);
        return text.slice(0, keep) + " ... " + text.slice(-keep);
      }
      default:
        return text.slice(0, maxChars - 3) + "...";
    }
  }
}
