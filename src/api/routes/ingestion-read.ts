import type { FastifyInstance } from "fastify";

import { getIngestionSessionSnapshot } from "../../services/ingestion-session.js";
import { serializeIngestionSessionResponse } from "../schemas.js";
import type { StoryGraphApiDependencies } from "../app.js";

export function registerIngestionReadRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.get("/api/ingestion/submissions/:sessionId", async (request, reply) => {
    const params = request.params as { sessionId?: string };
    const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
    const snapshot = await getIngestionSessionSnapshot(sessionId, dependencies);
    return reply.code(200).send(serializeIngestionSessionResponse(snapshot));
  });
}
