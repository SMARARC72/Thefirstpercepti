import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, readJsonBody, sendError, sendOk, withErrors } from "../../_lib/repo.js";

interface RecallBody {
  turn?: number;
}

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "POST") {
    sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
    return;
  }
  const repo = await getRepo();
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);
  // path: /api/npc-memories/<id>/recall  → id is parts[parts.length - 2]
  const memoryId = parts[parts.length - 2];
  if (!memoryId) {
    sendError(res, 400, "memory id missing from path", "bad_request");
    return;
  }
  const body = await readJsonBody<RecallBody>(req);
  if (body?.turn === undefined) {
    sendError(res, 400, "turn is required", "bad_request");
    return;
  }
  await repo.updateMemoryRecall(memoryId, body.turn);
  sendOk(res, { memoryId });
});
