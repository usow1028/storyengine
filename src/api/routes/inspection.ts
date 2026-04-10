import type { FastifyInstance } from "fastify";

import { buildRunInspectionPayload } from "../../services/inspection-payload.js";
import type { StoryGraphApiDependencies } from "../app.js";
import { InspectionRunParamsSchema, RunInspectionResponseSchema } from "../schemas.js";

export function registerInspectionRoutes(
  app: FastifyInstance,
  dependencies: StoryGraphApiDependencies
): void {
  app.get("/api/inspection/runs/:runId", async (request, reply) => {
    const params = InspectionRunParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: "Invalid inspection run id." });
    }

    const payload = await buildRunInspectionPayload({
      runId: params.data.runId,
      verdictRunRepository: dependencies.verdictRunRepository,
      verdictRepository: dependencies.verdictRepository
    });

    if (!payload) {
      return reply.code(404).send({ message: "Inspection run not found." });
    }

    return reply.code(200).send(RunInspectionResponseSchema.parse(payload));
  });
}
