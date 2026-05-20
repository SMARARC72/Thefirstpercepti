import { describe, it, expect } from "vitest";
import { ProxyLLMClient, ProxyLLMError } from "./ProxyLLMClient.js";
import type { LLMRequest } from "./types.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers as object | undefined) },
  });
}

function streamResponse(chunks: string[], headers: Record<string, string> = {}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "x-llm-provider": "claude",
      ...headers,
    },
  });
}

const baseRequest: LLMRequest = {
  model: "balanced",
  messages: [
    { role: "system", content: "You are a witness." },
    { role: "user", content: "What do you see?" },
  ],
  temperature: 0.7,
  max_tokens: 64,
};

describe("ProxyLLMClient.complete", () => {
  it("posts the envelope to /api/llm and unwraps the data field", async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return jsonResponse(
        {
          ok: true,
          data: {
            id: "resp-1",
            content: "Three knocks under the stone.",
            usage: { prompt_tokens: 10, completion_tokens: 7, total_tokens: 17 },
            latencyMs: 120,
          },
        },
        { headers: { "x-llm-provider": "claude", "x-llm-cached": "0" } },
      );
    }) as unknown as typeof fetch;

    const client = new ProxyLLMClient({ fetchImpl });
    const response = await client.complete(baseRequest);

    expect(captured.url).toBe("/api/llm");
    expect(captured.init?.method).toBe("POST");
    const body = JSON.parse((captured.init?.body as string) ?? "{}");
    expect(body.request.messages).toHaveLength(2);
    expect(body.provider).toBe("auto");
    expect(response.content).toBe("Three knocks under the stone.");
    expect(client.lastMeta.provider).toBe("claude");
    expect(client.lastMeta.cached).toBe(false);
  });

  it("surfaces the failover provider via lastMeta", async () => {
    const fetchImpl = (async () =>
      jsonResponse(
        {
          ok: true,
          data: {
            id: "resp-2",
            content: "Stillness.",
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
            latencyMs: 200,
          },
        },
        {
          headers: {
            "x-llm-provider": "kimi",
            "x-llm-failover-from": "claude",
          },
        },
      )) as unknown as typeof fetch;
    const client = new ProxyLLMClient({ fetchImpl });
    await client.complete(baseRequest);
    expect(client.lastMeta.provider).toBe("kimi");
    expect(client.lastMeta.failoverFrom).toBe("claude");
  });

  it("throws ProxyLLMError on non-2xx responses", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ ok: false, error: "provider down" }, { status: 503 })) as unknown as typeof fetch;
    const client = new ProxyLLMClient({ fetchImpl });
    await expect(client.complete(baseRequest)).rejects.toBeInstanceOf(ProxyLLMError);
  });
});

describe("ProxyLLMClient.stream", () => {
  it("parses SSE chunks into LLMStreamChunk values and returns a final response", async () => {
    const chunks = [
      `data: ${JSON.stringify({ delta: "Three " })}\n\n`,
      `data: ${JSON.stringify({ delta: "knocks." })}\n\n`,
      `data: ${JSON.stringify({ id: "stream-1", usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 }, finishReason: "stop" })}\n\n`,
      "data: [DONE]\n\n",
    ];
    const fetchImpl = (async () => streamResponse(chunks)) as unknown as typeof fetch;
    const client = new ProxyLLMClient({ fetchImpl });
    const deltas: string[] = [];
    const gen = client.stream(baseRequest);
    let final;
    while (true) {
      const next = await gen.next();
      if (next.done) {
        final = next.value;
        break;
      }
      if (next.value.delta) deltas.push(next.value.delta);
    }
    expect(deltas.join("")).toBe("Three knocks.");
    expect(final.id).toBe("stream-1");
    expect(final.usage.total_tokens).toBe(12);
    expect(client.lastMeta.provider).toBe("claude");
  });
});
