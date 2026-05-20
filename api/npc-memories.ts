import type { IncomingMessage, ServerResponse } from "node:http";
import type { NPCMemory } from "@first-perception/persistence";
import { getRepo, getQuery, readJsonBody, sendError, sendOk, withErrors } from "./_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  const repo = await getRepo();

  if (req.method === "GET") {
    const q = getQuery(req);
    const npcId = q.get("npcId");
    if (!npcId) {
      sendError(res, 400, "npcId is required", "bad_request");
      return;
    }
    const aboutEntityType = q.get("aboutEntityType");
    const aboutEntityId = q.get("aboutEntityId");
    if (aboutEntityType && aboutEntityId) {
      sendOk(res, await repo.getMemoriesAboutEntity(npcId, aboutEntityType, aboutEntityId));
      return;
    }
    const limit = q.get("limit") ? Number(q.get("limit")) : undefined;
    const minImportance = q.get("minImportance") ? Number(q.get("minImportance")) : undefined;
    const includeForgotten = q.get("includeForgotten") === "1";
    sendOk(res, await repo.getNPCMemories(npcId, { limit, minImportance, includeForgotten }));
    return;
  }

  if (req.method === "POST") {
    const memory = await readJsonBody<NPCMemory>(req);
    if (!memory?.memoryId || !memory.npcId) {
      sendError(res, 400, "memoryId and npcId are required", "bad_request");
      return;
    }
    await repo.addNPCMemory(memory);
    sendOk(res, { memoryId: memory.memoryId });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
