/**
 * Shared serverless helpers: a process-singleton PostgresRepository and
 * tiny request/response utilities. Vercel reuses warm function instances,
 * so caching the pool here keeps cold-start overhead off the hot path.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  PostgresRepository,
  type GameRepository,
} from "@first-perception/persistence/server";
import { apiError, apiOk, type ApiResponse } from "@first-perception/persistence";

declare global {
  // eslint-disable-next-line no-var
  var __tfp_repo: PostgresRepository | undefined;
}

/** Lazy-init repo, shared across warm invocations in one container. */
export async function getRepo(): Promise<GameRepository> {
  if (!globalThis.__tfp_repo) {
    globalThis.__tfp_repo = new PostgresRepository();
  }
  await globalThis.__tfp_repo.init();
  return globalThis.__tfp_repo;
}

export function sendJson<T>(
  res: ServerResponse,
  status: number,
  payload: ApiResponse<T>,
): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

export function sendOk<T>(res: ServerResponse, data: T, status = 200): void {
  sendJson(res, status, apiOk(data));
}

export function sendError(
  res: ServerResponse,
  status: number,
  message: string,
  code: NonNullable<ReturnType<typeof apiError>["code"]> = "internal",
): void {
  sendJson(res, status, apiError(message, code));
}

export async function readJsonBody<T = unknown>(req: IncomingMessage): Promise<T> {
  if (req.method === "GET" || req.method === "HEAD") {
    return {} as T;
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(text) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function getQuery(req: IncomingMessage): URLSearchParams {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  return url.searchParams;
}

/** Wraps a handler so any thrown error becomes a 500 JSON envelope. */
export function withErrors(
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        message.includes("connection string") || message.includes("ECONNREFUSED")
          ? "unavailable"
          : "internal";
      sendError(res, code === "unavailable" ? 503 : 500, message, code);
    }
  };
}
