import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, sendError, sendOk, withErrors } from "../../_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "POST") {
    sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
    return;
  }
  const repo = await getRepo();
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const rumorId = parts[parts.length - 2];
  if (!rumorId) {
    sendError(res, 400, "rumor id missing from path", "bad_request");
    return;
  }
  await repo.markRumorKnownToPlayer(rumorId);
  sendOk(res, { rumorId });
});
