import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, sendOk, withErrors } from "./_lib/repo.js";

// Phase 22.6 — non-leaky env var presence probe. Booleans only, never
// values. Used to diagnose missing-key vs reachable-key-with-bad-value.
function findEnv(canonical: string, aliases: string[] = []): boolean {
  const wanted = new Set([canonical.toLowerCase(), ...aliases.map((a) => a.toLowerCase())]);
  for (const [k, v] of Object.entries(process.env)) {
    if (v && wanted.has(k.toLowerCase())) return true;
  }
  return false;
}

export default withErrors(async (_req: IncomingMessage, res: ServerResponse) => {
  await getRepo(); // init triggers a SELECT 1 probe
  sendOk(res, {
    ok: true,
    schemaVersion: 1,
    env: {
      anthropic_key: findEnv("ANTHROPIC_API_KEY"),
      moonshot_key:  findEnv("MOONSHOT_API_KEY", ["MOONSHOOT_API_KEY"]),
      openai_key:    findEnv("OPENAI_API_KEY", ["OPEN_API_KEY"]),
      postgres_url:  Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING),
    },
  });
});
