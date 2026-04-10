import type { InspectionRepairCandidate } from "../types.js";

interface RepairCandidatesProps {
  repairs: InspectionRepairCandidate[];
}

function signedNumber(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function RepairCandidates({ repairs }: RepairCandidatesProps) {
  return (
    <section className="detail-section" aria-labelledby="repairs-heading">
      <h3 id="repairs-heading">Repair Candidates</h3>
      {repairs.length === 0 ? (
        <p>No repair candidates for this verdict.</p>
      ) : (
        <ol className="repair-list">
          {repairs.map((repair, index) => (
            <li key={repair.repairId} className="repair-item">
              <div className="repair-heading">
                <span className="repair-rank">Rank {index + 1}</span>
                <span>{repair.repairType}</span>
              </div>
              <p>{repair.summary}</p>
              <dl className="field-grid">
                <div>
                  <dt>Confidence band</dt>
                  <dd>{repair.confidenceBand}</dd>
                </div>
                <div>
                  <dt>Reason code</dt>
                  <dd>{repair.reasonCode}</dd>
                </div>
                <div>
                  <dt>Source finding IDs</dt>
                  <dd>
                    {repair.sourceFindingIds.length > 0
                      ? repair.sourceFindingIds.join(", ")
                      : "None"}
                  </dd>
                </div>
                {repair.plausibilityAdjustment ? (
                  <div>
                    <dt>Plausibility adjustment</dt>
                    <dd>
                      {signedNumber(repair.plausibilityAdjustment.adjustment)} with confidence{" "}
                      {repair.plausibilityAdjustment.confidence}. Prior layer{" "}
                      {repair.plausibilityAdjustment.dominantPriorLayer}.{" "}
                      {repair.plausibilityAdjustment.representativePatternSummary}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
