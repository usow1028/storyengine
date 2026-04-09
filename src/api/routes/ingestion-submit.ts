import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { submitIngestionSession } from "../../services/ingestion-session.js";
import {
  SubmitIngestionRequestSchema,
  serializeIngestionSessionResponse
} from "../schemas.js";
import type { StoryGraphApiDependencies } from "../app.js";

export function registerIngestionSubmitRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.post("/api/ingestion/submissions", async (request, reply) => {
    try {
      const body = SubmitIngestionRequestSchema.parse(request.body);
      const snapshot = await submitIngestionSession(
        {
          submissionKind: body.submissionKind,
          text: body.text,
          storyId: body.storyId,
          revisionId: body.revisionId,
          draftTitle: body.draftTitle,
          defaultRulePackName: body.defaultRulePackName
        },
        dependencies
      );

      return reply.code(201).send(serializeIngestionSessionResponse(snapshot));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Invalid ingestion submission request.",
          issues: error.issues
        });
      }

      throw error;
    }
  });
}
