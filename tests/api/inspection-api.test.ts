import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import { RunInspectionResponseSchema } from "../../src/api/schemas.js";
import type { RunInspectionSnapshot, VerdictRecord } from "../../src/domain/index.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { createConfiguredIngestionLlmClient } from "../../src/services/ingestion-session.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function hardVerdict(): VerdictRecord {
  return {
    verdictId: "verdict:api-hard",
    runId: "run:api-current",
    storyId: "story:test",
    revisionId: "revision:test",
    verdictKind: "Hard Contradiction",
    category: "temporal_contradiction",
    explanation: "A character cannot cross the ocean instantly.",
    evidence: {
      findingId: "finding:api-hard",
      representativeChecker: "time",
      reasonCode: "impossible_travel",
      eventIds: ["event:airport", "event:meeting"],
      stateBoundaryIds: ["boundary:a"],
      ruleVersionIds: ["ruleversion:reality"],
      provenanceIds: ["provenance:api-hard"],
      eventSummaries: [
        {
          eventId: "event:airport",
          eventType: "airport",
          sequence: 1,
          abstract: false,
          placeId: "place:seoul",
          actorIds: ["character:a"],
          targetIds: [],
          timeRelation: "after"
        },
        {
          eventId: "event:meeting",
          eventType: "meeting",
          sequence: 2,
          abstract: false,
          placeId: "place:newyork",
          actorIds: ["character:a"],
          targetIds: [],
          timeRelation: "same-window"
        }
      ],
      stateSummaries: [],
      ruleSummaries: [],
      conflictPath: ["event:airport", "event:meeting"],
      missingPremises: [],
      supportingFindings: [],
      notEvaluated: []
    },
    createdAt: "2026-04-10T11:00:00Z"
  };
}

function inspectionSnapshot(): RunInspectionSnapshot {
  const repair = {
    repairId: "repair:api-bridge",
    repairType: "add_prior_event" as const,
    reasonCode: "impossible_travel",
    sourceFindingIds: ["finding:api-hard"],
    confidenceBand: "high" as const,
    summary: "Add an explicit flight before the meeting.",
    payload: {
      insertBeforeEventId: "event:meeting",
      anchorEventId: "event:airport",
      eventType: "flight",
      summary: "The character takes a flight.",
      expectedEffect: "Travel becomes possible."
    }
  };

  return {
    runId: "run:api-current",
    createdAt: "2026-04-10T11:00:00Z",
    repairCandidates: [repair],
    advisory: {
      status: "available",
      assessment: {
        driftScores: {
          transition_drift: 0.62,
          motivation_drift: 0.1,
          rule_exception_rarity: 0.2
        },
        thresholds: {
          transition_drift: 0.5,
          motivation_drift: 0.5,
          rule_exception_rarity: 0.5
        },
        dominantPriorLayer: "baseline",
        triggeredDrifts: ["transition_drift"],
        representativePatternSummary: "Long travel needs setup.",
        contributions: [
          {
            layer: "baseline",
            genreKey: "baseline",
            worldProfile: "reality-default",
            driftType: "transition_drift",
            sampleCount: 9,
            confidence: 0.75,
            appliedWeight: 1,
            score: 0.62,
            threshold: 0.5,
            representativePatternSummary: "Long travel needs setup."
          }
        ]
      },
      rerankedRepairs: [repair],
      repairPlausibilityAdjustments: [
        {
          repairId: "repair:api-bridge",
          adjustment: 0.2,
          confidence: 0.75,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Long travel needs setup."
        }
      ]
    }
  };
}

describe("inspection api", () => {
  let pool: Pool;
  let storyRepository: StoryRepository;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);

    storyRepository = new StoryRepository(pool);
    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);

    await storyRepository.saveGraph(buildImpossibleTravelFixture().graph);
    await verdictRunRepository.saveRun({
      runId: "run:api-current",
      storyId: "story:test",
      revisionId: "revision:test",
      triggerKind: "test",
      createdAt: "2026-04-10T11:00:00Z"
    });
    await verdictRepository.saveVerdict(hardVerdict());
    await verdictRunRepository.saveInspectionSnapshot("run:api-current", inspectionSnapshot());
  });

  afterEach(async () => {
    await pool.end();
  });

  function buildApp() {
    return buildStoryGraphApi({
      ingestionSessionRepository: new IngestionSessionRepository(pool),
      storyRepository,
      ruleRepository: new RuleRepository(pool),
      provenanceRepository: new ProvenanceRepository(pool),
      verdictRepository,
      verdictRunRepository,
      llmClient: createConfiguredIngestionLlmClient({
        modelName: "test-model",
        extractor: async () => ({ candidates: [] })
      })
    });
  }

  it("returns a parsed run inspection response for an existing run", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Aapi-current"
    });

    expect(response.statusCode).toBe(200);
    const parsed = RunInspectionResponseSchema.parse(response.json());
    expect(parsed.run.runId).toBe("run:api-current");
    expect(parsed.groups.map((group) => group.verdictKind)).toEqual([
      "Hard Contradiction",
      "Repairable Gap",
      "Soft Drift",
      "Consistent"
    ]);
    const detail = parsed.detailsByVerdictId["verdict:api-hard"];
    expect(detail.deterministicVerdict).toMatchObject({
      verdictKind: "Hard Contradiction",
      reasonCode: "impossible_travel"
    });
    expect(detail.repairs[0]).toMatchObject({
      repairId: "repair:api-bridge",
      plausibilityAdjustment: {
        adjustment: 0.2
      }
    });
    expect(detail.advisory.status).toBe("available");
    expect(JSON.stringify(detail.deterministicVerdict)).not.toContain("advisory");
    expect(JSON.stringify(detail.repairs)).not.toContain("driftScores");

    const responseText = response.body;
    expect(responseText).not.toContain("sourceWorkIds");
    expect(responseText).not.toContain("snapshotDir");
    expect(responseText).not.toContain("snapshotSet");
    expect(responseText).not.toContain("PriorSnapshot");
    expect(responseText).not.toContain("genreWeights");

    await app.close();
  });

  it("returns stable 404 JSON for missing runs", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Amissing"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: "Inspection run not found." });

    await app.close();
  });

  it("rejects malformed run IDs without leaking internals", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/%20"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "Invalid inspection run id." });
    expect(response.body).not.toContain("stack");
    expect(response.body).not.toContain("SELECT");
    expect(response.body).not.toContain("inspection_snapshot");
    expect(response.body).not.toContain("/home/");

    await app.close();
  });
});
