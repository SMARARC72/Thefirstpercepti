import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentLogEntry } from "@first-perception/persistence";
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
    const agentType = q.get("agentType") ?? undefined;
    const limit = q.get("limit") ? Number(q.get("limit")) : undefined;
    sendOk(res, await repo.getAgentLogs(campaignId, { agentType, limit }));
    return;
  }

  if (req.method === "POST") {
    const log = await readJsonBody<AgentLogEntry>(req);
    if (!log?.agentLogId || !log.campaignId) {
      sendError(res, 400, "agentLogId and campaignId are required", "bad_request");
      return;
    }
    await repo.logAgentAction(log);
    sendOk(res, { agentLogId: log.agentLogId });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
