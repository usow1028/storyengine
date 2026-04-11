import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { buildRunInspectionPayload } from "../../services/inspection-payload.js";
import type { StoryGraphApiDependencies } from "../app.js";
import {
  InspectionRunParamsSchema,
  InspectionRunQuerySchema,
  RunInspectionResponseSchema
} from "../schemas.js";

function isMissingComparableRunError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith("Explicit baseRunId not found:")
  );
}

function isMissingComparableRevisionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith("No comparable verdict run found for revision ")
  );
}

function isIncompatibleComparisonError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("is not comparable to run") ||
      error.message.includes("requires a comparisonScopeKey"))
  );
}

export function registerInspectionRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.get("/api/inspection/runs/:runId", async (request, reply) => {
    const params = InspectionRunParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: "Invalid inspection run id." });
    }

    const query = InspectionRunQuerySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.code(400).send({
        message: "Invalid inspection request.",
        issues: query.error.issues
      });
    }

    try {
      const payload = await buildRunInspectionPayload({
        runId: params.data.runId,
        baseRunId: query.data.baseRunId,
        baseRevisionId: query.data.baseRevisionId,
        verdictRunRepository: dependencies.verdictRunRepository,
        verdictRepository: dependencies.verdictRepository
      });

      if (!payload) {
        return reply.code(404).send({ message: "Inspection run not found." });
      }

      return reply.code(200).send(RunInspectionResponseSchema.parse(payload));
    } catch (error) {
      if (isMissingComparableRunError(error)) {
        return reply.code(404).send({ message: "Comparable inspection run not found." });
      }

      if (isMissingComparableRevisionError(error)) {
        return reply.code(409).send({
          message: "Inspection comparison is incompatible."
        });
      }

      if (isIncompatibleComparisonError(error)) {
        return reply.code(409).send({
          message: "Inspection comparison is incompatible."
        });
      }

      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Invalid inspection request.",
          issues: error.issues
        });
      }

      throw error;
    }
  });
}
