import type { InspectionGroup, VerdictKind } from "../types.js";

interface VerdictTriageListProps {
  groups: InspectionGroup[];
  selectedVerdictId: string | null;
  onSelectVerdict: (verdictId: string) => void;
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
                <ul className="verdict-row-list">
                  {group.verdicts.map((verdict) => {
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
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
