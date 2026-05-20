import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, sendOk, withErrors } from "./_lib/repo.js";

export default withErrors(async (_req: IncomingMessage, res: ServerResponse) => {
  await getRepo(); // init triggers a SELECT 1 probe
  sendOk(res, { ok: true, schemaVersion: 1 });
});
