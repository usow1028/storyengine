export type VerdictKind =
  | "Hard Contradiction"
  | "Repairable Gap"
  | "Soft Drift"
  | "Consistent";

export type RunInspectionResponse = {
  run: {
    runId: string;
    storyId?: string;
    revisionId?: string;
    previousRunId?: string | null;
    triggerKind?: string;
    createdAt?: string;
  };
  groups: Array<{
    verdictKind: VerdictKind;
    count: number;
    verdicts: Array<{
      verdictId: string;
      verdictKind: VerdictKind;
      title?: string;
      explanation?: string;
    }>;
  }>;
  selectedVerdictId?: string | null;
  detailsByVerdictId?: Record<string, unknown>;
  diff?: unknown;
};
