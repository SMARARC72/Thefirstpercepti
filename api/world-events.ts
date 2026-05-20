import type { IncomingMessage, ServerResponse } from "node:http";
import type { WorldEvent } from "@first-perception/persistence";
import { getRepo, getQuery, readJsonBody, sendError, sendOk, withErrors } from "./_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  const repo = await getRepo();

  if (req.method === "GET") {
    const q = getQuery(req);
    const limit = Number(q.get("limit") ?? "20");
    const locationId = q.get("locationId");
    const campaignId = q.get("campaignId");
    if (locationId) {
      sendOk(res, await repo.getEventsAtLocation(locationId, limit));
      return;
    }
    if (campaignId) {
      sendOk(res, await repo.getRecentEvents(campaignId, limit));
      return;
    }
    sendError(res, 400, "locationId or campaignId is required", "bad_request");
    return;
  }

  if (req.method === "POST") {
    const event = await readJsonBody<WorldEvent>(req);
    if (!event?.eventId || !event.campaignId) {
      sendError(res, 400, "eventId and campaignId are required", "bad_request");
      return;
    }
    await repo.recordEvent(event);
    sendOk(res, { eventId: event.eventId });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
