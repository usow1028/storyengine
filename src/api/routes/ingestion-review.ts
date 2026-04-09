import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import type { StoryGraphApiDependencies } from "../app.js";
import {
  applyReviewPatch,
  approveReviewedSegment,
  IngestionConflictError,
  IngestionNotFoundError
} from "../../services/ingestion-review.js";
import {
  ReviewSegmentPatchRequestSchema,
  serializeIngestionSessionResponse
} from "../schemas.js";

export function registerIngestionReviewRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.patch("/api/ingestion/submissions/:sessionId/segments/:segmentId", async (request, reply) => {
    try {
      const params = request.params as { sessionId?: string; segmentId?: string };
      const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
      const segmentId = typeof params.segmentId === "string" ? params.segmentId : "";
      const body = ReviewSegmentPatchRequestSchema.parse(request.body);
      const snapshot = await applyReviewPatch(sessionId, segmentId, body, dependencies);
      return reply.code(200).send(serializeIngestionSessionResponse(snapshot));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Invalid review patch request.",
          issues: error.issues
        });
      }

      if (error instanceof IngestionNotFoundError) {
        return reply.code(404).send({ message: error.message });
      }

      if (error instanceof IngestionConflictError) {
        return reply.code(409).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post(
    "/api/ingestion/submissions/:sessionId/segments/:segmentId/approve",
    async (request, reply) => {
      try {
        const params = request.params as { sessionId?: string; segmentId?: string };
        const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
        const segmentId = typeof params.segmentId === "string" ? params.segmentId : "";
        const snapshot = await approveReviewedSegment(sessionId, segmentId, dependencies);
        return reply.code(200).send(serializeIngestionSessionResponse(snapshot));
      } catch (error) {
        if (error instanceof IngestionNotFoundError) {
          return reply.code(404).send({ message: error.message });
        }

        if (error instanceof IngestionConflictError) {
          return reply.code(409).send({ message: error.message });
        }

        throw error;
      }
    }
  );
}
