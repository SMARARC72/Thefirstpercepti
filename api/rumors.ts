import type { IncomingMessage, ServerResponse } from "node:http";
import type { Rumor } from "@first-perception/persistence";
import { getRepo, getQuery, readJsonBody, sendError, sendOk, withErrors } from "./_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  const repo = await getRepo();

  if (req.method === "GET") {
    const q = getQuery(req);
    const campaignId = q.get("campaignId");
    if (!campaignId) {
      sendError(res, 400, "campaignId is required", "bad_request");
      return;
    }
    sendOk(res, await repo.getRumorsKnownToPlayer(campaignId));
    return;
  }

  if (req.method === "POST") {
    const rumor = await readJsonBody<Rumor>(req);
    if (!rumor?.rumorId || !rumor.campaignId) {
      sendError(res, 400, "rumorId and campaignId are required", "bad_request");
      return;
    }
    await repo.addRumor(rumor);
    sendOk(res, { rumorId: rumor.rumorId });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
