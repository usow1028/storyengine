import { useEffect, useMemo, useState } from "react";

import {
  InspectionFilterBar,
  type InspectionFilterOptions,
  type InspectionFilterState
} from "./InspectionFilterBar.js";
import { InspectionOperationalBanner } from "./InspectionOperationalBanner.js";
import { VerdictDetailPanel } from "./VerdictDetailPanel.js";
import { VerdictTriageList } from "./VerdictTriageList.js";
import type { InspectionGroup, InspectionVerdictSummary, RunInspectionResponse } from "../types.js";

interface InspectionShellProps {
  data: RunInspectionResponse;
}

export const DEFAULT_INSPECTION_FILTERS: InspectionFilterState = {
  groupKey: "all",
  reviewState: "all",
  segmentId: "all"
};

function firstVerdictId(groups: InspectionGroup[]): string | null {
  for (const group of groups) {
    const verdict = group.verdicts[0];
    if (verdict) {
      return verdict.verdictId;
    }
  }

  return null;
}

function preferredVerdictId(
  data: Pick<RunInspectionResponse, "selectedVerdictId" | "detailsByVerdictId"> & {
    groups: InspectionGroup[];
  }
): string | null {
  if (data.selectedVerdictId && data.detailsByVerdictId[data.selectedVerdictId]) {
    const visibleIds = new Set(
      data.groups.flatMap((group) => group.verdicts.map((verdict) => verdict.verdictId))
    );
    if (visibleIds.has(data.selectedVerdictId)) {
      return data.selectedVerdictId;
    }
  }

  return firstVerdictId(data.groups);
}

function humanizeReviewState(reviewState: string): string {
  switch (reviewState) {
    case "needs_review":
      return "Needs review";
    case "partial_failure":
      return "Partial failure";
    case "partially_approved":
      return "Partially approved";
    default:
      return reviewState.charAt(0).toUpperCase() + reviewState.slice(1).replaceAll("_", " ");
  }
}

function collectVerdicts(groups: InspectionGroup[]): InspectionVerdictSummary[] {
  return groups.flatMap((group) => group.verdicts);
}

export function deriveInspectionFilterOptions(
  groups: InspectionGroup[]
): InspectionFilterOptions {
  const verdicts = collectVerdicts(groups);
  const groupCounts = new Map<string, { label: string; count: number }>();
  const reviewStateCounts = new Map<string, number>();
  const segmentCounts = new Map<string, { label: string; count: number }>();

  for (const verdict of verdicts) {
    if (verdict.secondaryGroup) {
      const existing = groupCounts.get(verdict.secondaryGroup.groupKey);
      groupCounts.set(verdict.secondaryGroup.groupKey, {
        label: verdict.secondaryGroup.label,
        count: (existing?.count ?? 0) + 1
      });
    }

    if (verdict.provenanceSummary?.reviewState) {
      reviewStateCounts.set(
        verdict.provenanceSummary.reviewState,
        (reviewStateCounts.get(verdict.provenanceSummary.reviewState) ?? 0) + 1
      );
    }

    if (verdict.provenanceSummary?.segmentId && verdict.provenanceSummary.segmentLabel) {
      const existing = segmentCounts.get(verdict.provenanceSummary.segmentId);
      segmentCounts.set(verdict.provenanceSummary.segmentId, {
        label: verdict.provenanceSummary.segmentLabel,
        count: (existing?.count ?? 0) + 1
      });
    }
  }

  return {
    groups: [
      { value: "all", label: "All chapters and sections", count: verdicts.length },
      ...[...groupCounts.entries()]
        .map(([value, entry]) => ({
          value,
          label: entry.label,
          count: entry.count
        }))
        .sort((left, right) => left.label.localeCompare(right.label))
    ],
    reviewStates: [
      { value: "all", label: "All review states", count: verdicts.length },
      ...[...reviewStateCounts.entries()]
        .map(([value, count]) => ({
          value,
          label: humanizeReviewState(value),
          count
        }))
        .sort((left, right) => left.label.localeCompare(right.label))
    ],
    segments: [
      { value: "all", label: "All segments", count: verdicts.length },
      ...[...segmentCounts.entries()]
        .map(([value, entry]) => ({
          value,
          label: entry.label,
          count: entry.count
        }))
        .sort((left, right) => left.label.localeCompare(right.label))
    ]
  };
}

function matchesFilters(
  verdict: InspectionVerdictSummary,
  filters: InspectionFilterState
): boolean {
  if (
    filters.groupKey !== "all" &&
    verdict.secondaryGroup?.groupKey !== filters.groupKey
  ) {
    return false;
  }

  if (
    filters.reviewState !== "all" &&
    verdict.provenanceSummary?.reviewState !== filters.reviewState
  ) {
    return false;
  }

  if (
    filters.segmentId !== "all" &&
    verdict.provenanceSummary?.segmentId !== filters.segmentId
  ) {
    return false;
  }

  return true;
}

export function filterInspectionGroups(
  groups: InspectionGroup[],
  filters: InspectionFilterState
): InspectionGroup[] {
  return groups.map((group) => {
    const verdicts = group.verdicts.filter((verdict) => matchesFilters(verdict, filters));

    return {
      ...group,
      count: verdicts.length,
      verdicts
    };
  });
}

export function InspectionShell({ data }: InspectionShellProps) {
  const [filters, setFilters] = useState<InspectionFilterState>(DEFAULT_INSPECTION_FILTERS);
  const filterOptions = useMemo(
    () => deriveInspectionFilterOptions(data.groups),
    [data.groups]
  );
  const visibleGroups = useMemo(
    () => filterInspectionGroups(data.groups, filters),
    [data.groups, filters]
  );
  const defaultVerdictId = useMemo(
    () =>
      preferredVerdictId({
        selectedVerdictId: data.selectedVerdictId,
        detailsByVerdictId: data.detailsByVerdictId,
        groups: visibleGroups
      }),
    [data.detailsByVerdictId, data.selectedVerdictId, visibleGroups]
  );
  const [selectedVerdictId, setSelectedVerdictId] = useState<string | null>(
    defaultVerdictId
  );

  useEffect(() => {
    if (selectedVerdictId && data.detailsByVerdictId[selectedVerdictId]) {
      const isVisible = visibleGroups.some((group) =>
        group.verdicts.some((verdict) => verdict.verdictId === selectedVerdictId)
      );
      if (isVisible) {
        return;
      }
    }

    setSelectedVerdictId(defaultVerdictId);
  }, [data.detailsByVerdictId, defaultVerdictId, selectedVerdictId, visibleGroups]);

  const selectedDetail = selectedVerdictId
    ? data.detailsByVerdictId[selectedVerdictId]
    : undefined;
  const operationalSummary = data.run.operationalSummary ?? null;

  return (
    <main className="inspection-console" aria-labelledby="inspection-title">
      <header className="inspection-header">
        <div>
          <h1 id="inspection-title">Inspection Console</h1>
        </div>
        <dl className="run-metadata" aria-label="Inspection run metadata">
          <div>
            <dt>Run</dt>
            <dd>{data.run.runId}</dd>
          </div>
          <div>
            <dt>Story</dt>
            <dd>{data.run.storyId}</dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>{data.run.revisionId}</dd>
          </div>
          <div>
            <dt>Trigger</dt>
            <dd>{data.run.triggerKind}</dd>
          </div>
          {data.run.scopeSummary ? (
            <div>
              <dt>Scope</dt>
              <dd>{data.run.scopeSummary.scopeKind}</dd>
            </div>
          ) : null}
          {data.run.previousRunId ? (
            <div>
              <dt>Previous</dt>
              <dd>{data.run.previousRunId}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {operationalSummary && operationalSummary.warningCount > 0 ? (
        <InspectionOperationalBanner summary={operationalSummary} />
      ) : null}

      <InspectionFilterBar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
      />

      <div className="inspection-layout">
        {/* Verdict Triage remains the fixed outer rail even when filters regroup rows. */}
        <VerdictTriageList
          groups={visibleGroups}
          selectedVerdictId={selectedVerdictId}
          onSelectVerdict={setSelectedVerdictId}
        />
        <VerdictDetailPanel detail={selectedDetail} />
      </div>
    </main>
  );
}
