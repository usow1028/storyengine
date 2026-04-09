import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { extractIngestionSession } from "../../services/ingestion-session.js";
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
      ExtractSubmissionRequestSchema.parse(request.body ?? {});
      const snapshot = await extractIngestionSession(sessionId, dependencies);
      return reply.code(200).send(serializeIngestionSessionResponse(snapshot));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Invalid extraction request.",
          issues: error.issues
        });
      }

      throw error;
    }
  });
}
