import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, readJsonBody, sendError, sendOk, withErrors } from "../_lib/repo.js";

interface ForgetBody {
  npcId?: string;
  beforeTurn?: number;
  threshold?: number;
}

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "POST") {
    sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
    return;
  }
  const repo = await getRepo();
  const body = await readJsonBody<ForgetBody>(req);
  if (!body?.npcId || body.beforeTurn === undefined || body.threshold === undefined) {
    sendError(res, 400, "npcId, beforeTurn, threshold are required", "bad_request");
    return;
  }
  const forgotten = await repo.forgetOldMemories(body.npcId, body.beforeTurn, body.threshold);
  sendOk(res, { forgotten });
});
