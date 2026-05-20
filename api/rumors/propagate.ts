import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, readJsonBody, sendError, sendOk, withErrors } from "../_lib/repo.js";

interface PropagateBody {
  campaignId?: string;
}

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "POST") {
    sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
    return;
  }
  const repo = await getRepo();
  const body = await readJsonBody<PropagateBody>(req);
  if (!body?.campaignId) {
    sendError(res, 400, "campaignId is required", "bad_request");
    return;
  }
  const propagated = await repo.propagateRumors(body.campaignId);
  sendOk(res, { propagated });
});
