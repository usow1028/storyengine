import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { executeIngestionCheck } from "../../services/ingestion-check.js";
import { IngestionConflictError } from "../../services/ingestion-review.js";
import type { StoryGraphApiDependencies } from "../app.js";
import {
  CheckIngestionRequestSchema,
  CheckIngestionResponseSchema
} from "../schemas.js";

export function registerIngestionCheckRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.post("/api/ingestion/submissions/:sessionId/check", async (request, reply) => {
    try {
      const params = request.params as { sessionId?: string };
      const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
      const body = CheckIngestionRequestSchema.parse(request.body ?? {});
      const result = await executeIngestionCheck(sessionId, dependencies, {
        scopeId: body.scopeId
      });
      return reply.code(200).send(CheckIngestionResponseSchema.parse(result));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Invalid check request.",
          issues: error.issues
        });
      }

      if (error instanceof IngestionConflictError) {
        return reply.code(409).send({ message: error.message });
      }

      throw error;
    }
  });
}
