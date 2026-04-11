import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { extractIngestionSession } from "../../services/ingestion-session.js";
import {
  IngestionConflictError,
  IngestionNotFoundError
} from "../../services/ingestion-review.js";
import {
  ExtractSubmissionRequestSchema,
  serializeIngestionSessionResponse
} from "../schemas.js";
import type { StoryGraphApiDependencies } from "../app.js";

export function registerIngestionExtractRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.post("/api/ingestion/submissions/:sessionId/extract", async (request, reply) => {
    try {
      const params = request.params as { sessionId?: string };
      const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
      const body = ExtractSubmissionRequestSchema.parse(request.body ?? {});
      const snapshot = await extractIngestionSession(sessionId, {
        ...dependencies,
        targetSegmentIds: body.segmentIds,
        allowApprovalReset: body.allowApprovalReset
      });
      return reply.code(200).send(serializeIngestionSessionResponse(snapshot));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Invalid extraction request.",
          issues: error.issues
        });
      }

      if (error instanceof IngestionConflictError) {
        return reply.code(409).send({
          message: error.message
        });
      }

      if (error instanceof IngestionNotFoundError) {
        return reply.code(404).send({
          message: error.message
        });
      }

      throw error;
    }
  });
}
