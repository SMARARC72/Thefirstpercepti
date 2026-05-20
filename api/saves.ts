import type { IncomingMessage, ServerResponse } from "node:http";
import type { SaveSlot } from "@first-perception/persistence";
import { getRepo, getQuery, readJsonBody, sendError, sendOk, withErrors } from "./_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  const repo = await getRepo();

  if (req.method === "GET") {
    const campaignId = getQuery(req).get("campaignId");
    if (!campaignId) {
      sendError(res, 400, "campaignId is required", "bad_request");
      return;
    }
    const slots = await repo.listSnapshots(campaignId);
    sendOk(res, slots);
    return;
  }

  if (req.method === "POST") {
    const slot = await readJsonBody<SaveSlot>(req);
    if (!slot || !slot.saveId || !slot.campaignId) {
      sendError(res, 400, "saveId and campaignId are required", "bad_request");
      return;
    }
    await repo.saveSnapshot(slot);
    sendOk(res, { saveId: slot.saveId });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
