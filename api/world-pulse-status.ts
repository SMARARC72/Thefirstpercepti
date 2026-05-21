import type { IncomingMessage, ServerResponse } from "node:http";
import { isLeanMode } from "@first-perception/llm-client/middleware";
import { sendOk, withErrors } from "./_lib/repo.js";

// Phase 22.6 / WIRING-402 — thin status probe for the LeanModeBadge.
// Keeps the browser bundle free of the throttle middleware (and its
// transitive Postgres driver import). The badge fetches this endpoint
// on mount; a failure (network / 5xx) suppresses the badge silently.
export default withErrors(async (_req: IncomingMessage, res: ServerResponse) => {
  let lean = false;
  try {
    lean = await isLeanMode();
  } catch {
    // Lean-mode probe is advisory; failure shouldn't 500 the request.
    lean = false;
  }
  sendOk(res, { lean });
});
