import type { IncomingMessage, ServerResponse } from "node:http";
import type { LegacyRecord } from "@first-perception/persistence";
import { getRepo, getQuery, readJsonBody, sendError, sendOk, withErrors } from "./_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  const repo = await getRepo();

  if (req.method === "GET") {
    const limit = Number(getQuery(req).get("limit") ?? "20");
    sendOk(res, await repo.listLegacies(limit));
    return;
  }

  if (req.method === "POST") {
    const legacy = await readJsonBody<LegacyRecord>(req);
    if (!legacy?.legacyId || !legacy.characterName) {
      sendError(res, 400, "legacyId and characterName are required", "bad_request");
      return;
    }
    await repo.recordLegacy(legacy);
    sendOk(res, { legacyId: legacy.legacyId });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
