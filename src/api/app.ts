import Fastify, { type FastifyInstance } from "fastify";

import {
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../storage/index.js";
import type { IngestionLlmClient } from "../services/ingestion-llm-client.js";
import { registerIngestionCheckRoutes } from "./routes/ingestion-check.js";
import { registerIngestionExtractRoutes } from "./routes/ingestion-extract.js";
import { registerIngestionReadRoutes } from "./routes/ingestion-read.js";
import { registerIngestionReviewRoutes } from "./routes/ingestion-review.js";
import { registerIngestionSubmitRoutes } from "./routes/ingestion-submit.js";

export interface StoryGraphApiDependencies {
  ingestionSessionRepository: IngestionSessionRepository;
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  provenanceRepository: ProvenanceRepository;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
  llmClient: IngestionLlmClient;
  now?: () => string;
  generateId?: () => string;
}

export function buildStoryGraphApi(dependencies: StoryGraphApiDependencies): FastifyInstance {
  const app = Fastify();

  registerIngestionSubmitRoutes(app, dependencies);
  registerIngestionExtractRoutes(app, dependencies);
  registerIngestionReadRoutes(app, dependencies);
  registerIngestionReviewRoutes(app, dependencies);
  registerIngestionCheckRoutes(app, dependencies);

  return app;
}
