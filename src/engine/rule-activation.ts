import type { EventRuleChange } from "../domain/index.js";
import type { ActiveRuleSnapshot, CheckerKind } from "./types.js";

const SCOPE_RANK = {
  global: 1,
  story: 2,
  location: 3,
  character: 4,
  event: 5
} as const;

interface ResolveActiveRuleSetInput {
  eventId: string;
  actorIds: string[];
  placeId?: string;
  availableRules: ActiveRuleSnapshot[];
  explicitRuleChanges: EventRuleChange[];
}

function isRuleTargetMatch(input: ResolveActiveRuleSetInput, snapshot: ActiveRuleSnapshot): boolean {
  const targetId = snapshot.metadata.scopeTargetId;

  switch (snapshot.metadata.scope) {
    case "global":
    case "story":
      return snapshot.metadata.active;
    case "location":
      return snapshot.metadata.active && targetId !== undefined && input.placeId === targetId;
    case "character":
      return (
        snapshot.metadata.active && targetId !== undefined && input.actorIds.includes(targetId)
      );
    case "event":
      return snapshot.metadata.active && targetId !== undefined && input.eventId === targetId;
    default:
      return false;
  }
}

function hasExplicitActivation(
  explicitRuleChanges: EventRuleChange[],
  snapshot: ActiveRuleSnapshot
): boolean {
  return explicitRuleChanges.some(
    (change) =>
      change.ruleVersionId === snapshot.version?.ruleVersionId &&
      (change.operation === "activate" ||
        change.operation === "override" ||
        change.operation === "declare")
  );
}

function isExplicitlyDeactivated(
  explicitRuleChanges: EventRuleChange[],
  snapshot: ActiveRuleSnapshot
): boolean {
  return explicitRuleChanges.some(
    (change) =>
      change.ruleVersionId === snapshot.version?.ruleVersionId && change.operation === "deactivate"
  );
}

export function resolveActiveRuleSet(input: ResolveActiveRuleSetInput): ActiveRuleSnapshot[] {
  const eligible = input.availableRules.filter((snapshot) => {
    if (isExplicitlyDeactivated(input.explicitRuleChanges, snapshot)) {
      return false;
    }

    if (hasExplicitActivation(input.explicitRuleChanges, snapshot)) {
      return true;
    }

    return isRuleTargetMatch(input, snapshot);
  });

  const winningByAffiliation = new Map<string, ActiveRuleSnapshot>();
  for (const snapshot of eligible) {
    const key = snapshot.metadata.worldAffiliation;
    const existing = winningByAffiliation.get(key);

    if (!existing) {
      winningByAffiliation.set(key, snapshot);
      continue;
    }

    const existingRank = SCOPE_RANK[existing.metadata.scope];
    const nextRank = SCOPE_RANK[snapshot.metadata.scope];
    if (
      nextRank > existingRank ||
      (nextRank === existingRank && snapshot.metadata.priority > existing.metadata.priority)
    ) {
      winningByAffiliation.set(key, snapshot);
    }
  }

  return [...winningByAffiliation.values()].sort((left, right) => {
    const scopeDiff = SCOPE_RANK[right.metadata.scope] - SCOPE_RANK[left.metadata.scope];
    if (scopeDiff !== 0) {
      return scopeDiff;
    }
    return right.metadata.priority - left.metadata.priority;
  });
}

export function blockedCheckerKinds(): CheckerKind[] {
  return ["causality", "character"];
}
