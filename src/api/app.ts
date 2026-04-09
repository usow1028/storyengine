import Fastify, { type FastifyInstance } from "fastify";

import { IngestionSessionRepository } from "../storage/index.js";
import type { IngestionLlmClient } from "../services/ingestion-llm-client.js";
import { registerIngestionExtractRoutes } from "./routes/ingestion-extract.js";
import { registerIngestionReadRoutes } from "./routes/ingestion-read.js";
import { registerIngestionSubmitRoutes } from "./routes/ingestion-submit.js";

export interface StoryGraphApiDependencies {
  ingestionSessionRepository: IngestionSessionRepository;
  llmClient: IngestionLlmClient;
  now?: () => string;
  generateId?: () => string;
}

export function buildStoryGraphApi(dependencies: StoryGraphApiDependencies): FastifyInstance {
  const app = Fastify();

  registerIngestionSubmitRoutes(app, dependencies);
  registerIngestionExtractRoutes(app, dependencies);
  registerIngestionReadRoutes(app, dependencies);

  return app;
}
