import type { IncomingMessage, ServerResponse } from "node:http";
import { getRepo, sendError, sendOk, withErrors } from "../_lib/repo.js";

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  const repo = await getRepo();
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const id = url.pathname.split("/").filter(Boolean).pop();
  if (!id) {
    sendError(res, 400, "save id missing from path", "bad_request");
    return;
  }

  if (req.method === "DELETE") {
    await repo.deleteSnapshot(id);
    sendOk(res, { saveId: id });
    return;
  }

  sendError(res, 405, `Method ${req.method} not allowed`, "bad_request");
});
