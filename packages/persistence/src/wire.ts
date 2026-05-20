/**
 * Wire envelopes used between the browser (HttpRepository) and the
 * /api/* serverless functions. Keep these stable; clients in the wild
 * may have older bundles for a few minutes after deploy.
 */

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  /** Machine-readable error code. */
  code?: "bad_request" | "not_found" | "internal" | "unavailable";
}

export type ApiResponse<T> = ApiOk<T> | ApiError;

export function apiOk<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function apiError(error: string, code: ApiError["code"] = "internal"): ApiError {
  return { ok: false, error, code };
}
