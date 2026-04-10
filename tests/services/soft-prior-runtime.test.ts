import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildSoftPriorTransitionInputs,
  evaluateConfiguredSoftPrior
} from "../../src/services/index.js";
import type { CanonicalStoryGraph } from "../../src/storage/index.js";

const tempDirs: string[] = [];

function buildRuntimeGraph(options?: {
  defaultRulePackName?: string;
  events?: CanonicalStoryGraph["events"];
}): CanonicalStoryGraph {
  const storyId = "story:soft-prior-runtime";
  const revisionId = "revision:soft-prior-runtime";

  return {
    story: {
      storyId,
      title: "Soft Prior Runtime",
      description: "",
      defaultRulePackName: options?.defaultRulePackName ?? "fantasy-light"
    },
    revision: {
      revisionId,
      storyId,
      sourceKind: "manual",
      createdAt: "2026-04-10T04:00:00Z"
    },
    entities: [
      {
        entityId: "character:mage",
        storyId,
        revisionId,
        entityKind: "character",
        name: "Mage",
        aliases: [],
        description: "",
        archetypes: [],
        defaultLoyalties: []
      }
    ],
    stateBoundaries: [],
    events:
      options?.events ??
      [
        {
          eventId: "event:arrival",
          storyId,
          revisionId,
          eventType: "instant_arrival",
          abstract: false,
          actorIds: ["character:mage"],
          targetIds: [],
          sequence: 2,
          time: { relation: "same-window" },
          placeId: "place:castle",
          preconditions: [
            {
              description: "gate is open",
              actorId: "character:mage",
              requiredRuleVersionId: "rule:gate-ready"
            },
            {
              description: "mana is focused",
              actorId: "character:mage"
            }
          ],
          effects: [
            {
              effectId: "effect:arrival",
              description: "",
              stateChanges: [
                {
                  subjectId: "character:mage",
                  field: "locationId",
                  operation: "set",
                  value: "place:castle"
                },
                {
                  subjectId: "character:mage",
                  field: "mood",
                  operation: "set",
                  value: null
                }
              ],
              ruleChanges: [
                {
                  ruleVersionId: "arrival_exception",
                  operation: "override"
                }
              ]
            }
          ],
          causalLinkIds: []
        },
        {
          eventId: "event:spell",
          storyId,
          revisionId,
          eventType: "spell_cast",
          abstract: false,
          actorIds: ["character:mage"],
          targetIds: [],
          sequence: 1,
          time: { relation: "before" },
          placeId: "place:ruins",
          preconditions: [],
          effects: [
            {
              effectId: "effect:spell",
              description: "",
              stateChanges: [
                {
                  subjectId: "character:mage",
                  field: "resources",
                  operation: "remove",
                  value: "mana_reserve"
                }
              ],
              ruleChanges: [
                {
                  ruleVersionId: "teleportation_enabled",
                  operation: "activate"
                }
              ]
            }
          ],
          causalLinkIds: []
        }
      ],
    causalLinks: []
  };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("soft prior runtime", () => {
  it("builds one adjacent transition and mirrors corpus state transition tokens", () => {
    const [transition] = buildSoftPriorTransitionInputs(buildRuntimeGraph());

    expect(transition).toMatchObject({
      currentEventType: "spell_cast",
      nextEventType: "instant_arrival",
      stateAxes: ["locationId", "mood"],
      stateTransitionTokens: ["locationId:set:place:castle", "mood:set:unknown"],
      worldProfile: "fantasy-light",
      genreWeights: [{ genreKey: "baseline", weight: 1 }]
    });
  });

  it("collects rule exception tokens from both events and next-event precondition tokens", () => {
    const [transition] = buildSoftPriorTransitionInputs(buildRuntimeGraph());

    expect(transition?.worldRuleExceptionTokens).toEqual([
      "arrival_exception",
      "teleportation_enabled"
    ]);
    expect(transition?.preconditionTokens).toEqual(["mana is focused", "rule:gate-ready"]);
  });

  it("returns disabled when runtime config is not explicitly enabled", async () => {
    await expect(
      evaluateConfiguredSoftPrior({
        graph: buildRuntimeGraph(),
        repairs: [],
        softPriorConfig: {},
        hardVerdictKind: "Consistent"
      })
    ).resolves.toMatchObject({ status: "disabled" });
  });

  it("returns missing_snapshot when enabled config has no snapshot source", async () => {
    await expect(
      evaluateConfiguredSoftPrior({
        graph: buildRuntimeGraph(),
        repairs: [],
        softPriorConfig: { enabled: true },
        hardVerdictKind: "Consistent"
      })
    ).resolves.toMatchObject({ status: "missing_snapshot" });
  });

  it("returns invalid_snapshot for malformed prior artifacts without throwing", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "storygraph-priors-invalid-"));
    tempDirs.push(tempDir);
    await writeFile(path.join(tempDir, "baseline.prior.json"), "{not json", "utf8");

    await expect(
      evaluateConfiguredSoftPrior({
        graph: buildRuntimeGraph(),
        repairs: [],
        softPriorConfig: { enabled: true, snapshotDir: tempDir },
        hardVerdictKind: "Consistent"
      })
    ).resolves.toMatchObject({ status: "invalid_snapshot" });
  });
});
