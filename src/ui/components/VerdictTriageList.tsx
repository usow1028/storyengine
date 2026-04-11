import type { InspectionGroup, InspectionVerdictSummary, VerdictKind } from "../types.js";

interface VerdictTriageListProps {
  groups: InspectionGroup[];
  selectedVerdictId: string | null;
  onSelectVerdict: (verdictId: string) => void;
}

interface VerdictSubgroup {
  key: string;
  label: string;
  verdicts: InspectionVerdictSummary[];
}

function verdictKindClassName(verdictKind: VerdictKind): string {
  switch (verdictKind) {
    case "Hard Contradiction":
      return "kind-hard";
    case "Repairable Gap":
      return "kind-repairable";
    case "Soft Drift":
      return "kind-soft";
    case "Consistent":
      return "kind-consistent";
  }
}

function headingId(verdictKind: VerdictKind): string {
  return `triage-${verdictKind.toLowerCase().replaceAll(" ", "-")}`;
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

function subgroupVerdicts(verdicts: InspectionVerdictSummary[]): VerdictSubgroup[] {
  const grouped = new Map<string, VerdictSubgroup>();

  for (const verdict of verdicts) {
    const key = verdict.secondaryGroup?.groupKey ?? `ungrouped:${verdict.verdictId}`;
    const label = verdict.secondaryGroup?.label ?? "Ungrouped";
    const existing = grouped.get(key);
    if (existing) {
      existing.verdicts.push(verdict);
      continue;
    }

    grouped.set(key, {
      key,
      label,
      verdicts: [verdict]
    });
  }

  return [...grouped.values()];
}

function renderMetadataChips(verdict: InspectionVerdictSummary) {
  const chips = [
    verdict.secondaryGroup?.label,
    verdict.provenanceSummary?.segmentLabel,
    verdict.provenanceSummary?.reviewState
      ? humanizeReviewState(verdict.provenanceSummary.reviewState)
      : null,
    verdict.provenanceSummary?.sourceSpans.length
      ? `${verdict.provenanceSummary.sourceSpans.length} spans`
      : null
  ].filter((value): value is string => Boolean(value));

  if (chips.length === 0) {
    return null;
  }

  return (
    <span className="verdict-row-chips">
      {chips.map((chip) => (
        <span key={chip} className="verdict-chip">
          {chip}
        </span>
      ))}
    </span>
  );
}

export function VerdictTriageList({
  groups,
  selectedVerdictId,
  onSelectVerdict
}: VerdictTriageListProps) {
  return (
    <aside className="triage-rail" aria-labelledby="triage-heading">
      <div className="triage-heading-row">
        <h2 id="triage-heading">Verdict Triage</h2>
      </div>

      <div className="triage-groups">
        {groups.map((group) => {
          const groupHeadingId = headingId(group.verdictKind);
          const kindClassName = verdictKindClassName(group.verdictKind);
          const subgroups = subgroupVerdicts(group.verdicts);

          return (
            <section
              key={group.verdictKind}
              className="triage-group"
              aria-labelledby={groupHeadingId}
            >
              <div className="triage-group-heading">
                <h3 id={groupHeadingId}>
                  <span className={`verdict-stripe ${kindClassName}`} />
                  {group.verdictKind}
                </h3>
                <span className="group-count">{group.count}</span>
              </div>

              {group.verdicts.length === 0 ? (
                <p className="triage-empty">No findings</p>
              ) : (
                <div className="verdict-subgroup-list">
                  {subgroups.map((subgroup) => (
                    <section
                      key={subgroup.key}
                      className="verdict-subgroup"
                      aria-label={`${group.verdictKind} grouped section ${subgroup.label}`}
                    >
                      <div className="verdict-subgroup-heading">
                        <span>{subgroup.label}</span>
                        <span>{subgroup.verdicts.length}</span>
                      </div>

                      <ul className="verdict-row-list">
                        {subgroup.verdicts.map((verdict) => {
                          const isSelected = verdict.verdictId === selectedVerdictId;

                          return (
                            <li key={verdict.verdictId}>
                              <button
                                type="button"
                                className={`verdict-row ${kindClassName}`}
                                aria-current={isSelected ? "true" : undefined}
                                onClick={() => onSelectVerdict(verdict.verdictId)}
                              >
                                <span className="verdict-row-title">
                                  {verdict.reasonCode ?? verdict.findingId ?? verdict.verdictId}
                                </span>
                                <span className="verdict-row-copy">{verdict.explanation}</span>
                                {renderMetadataChips(verdict)}
                                <span className="verdict-row-meta">
                                  <span>{verdict.category}</span>
                                  <span>{verdict.eventCount} events</span>
                                  <span>{verdict.repairCandidateCount} repairs</span>
                                </span>
                                <span className="row-cta">Inspect Verdict</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
