import type { InspectionOperationalSummary } from "../types.js";

interface InspectionOperationalBannerProps {
  summary: InspectionOperationalSummary;
}

function pluralizeSegments(count: number): string {
  return count === 1 ? "segment" : "segments";
}

export function InspectionOperationalBanner({
  summary
}: InspectionOperationalBannerProps) {
  return (
    <section
      className="inspection-operational-banner"
      aria-labelledby="inspection-operational-heading"
      role="status"
    >
      <div className="inspection-operational-copy">
        <p className="inspection-operational-kicker">Operational Guardrails</p>
        <h2 id="inspection-operational-heading">Mixed-state warning banner</h2>
        <p>
          This inspection run is still attached to draft state with unresolved or unsafe
          segments outside the currently inspectable scope.
        </p>
      </div>

      <ul className="inspection-operational-counts" aria-label="Operational warning counts">
        <li>
          <strong>{summary.warningCount}</strong> total warnings
        </li>
        <li>
          <strong>{summary.staleSegmentCount}</strong> stale{" "}
          {pluralizeSegments(summary.staleSegmentCount)}
        </li>
        <li>
          <strong>{summary.unresolvedSegmentCount}</strong> unresolved{" "}
          {pluralizeSegments(summary.unresolvedSegmentCount)}
        </li>
        <li>
          <strong>{summary.failedSegmentCount}</strong> failed{" "}
          {pluralizeSegments(summary.failedSegmentCount)}
        </li>
      </ul>
    </section>
  );
}
