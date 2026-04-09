import type { FastifyInstance } from "fastify";

import { executeIngestionCheck } from "../../services/ingestion-check.js";
import { IngestionConflictError } from "../../services/ingestion-review.js";
import type { StoryGraphApiDependencies } from "../app.js";
import { CheckIngestionResponseSchema } from "../schemas.js";

export function registerIngestionCheckRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.post("/api/ingestion/submissions/:sessionId/check", async (request, reply) => {
    try {
      const params = request.params as { sessionId?: string };
      const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
      const result = await executeIngestionCheck(sessionId, dependencies);
      return reply.code(200).send(CheckIngestionResponseSchema.parse(result));
    } catch (error) {
      if (error instanceof IngestionConflictError) {
        return reply.code(409).send({ message: error.message });
      }

      throw error;
    }
  });
}
