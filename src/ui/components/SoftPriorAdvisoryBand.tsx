import type { InspectionVerdictDetail } from "../types.js";

interface SoftPriorAdvisoryBandProps {
  advisory: InspectionVerdictDetail["advisory"];
}

function formatList(values: string[], emptyText = "None"): string {
  return values.length > 0 ? values.join(", ") : emptyText;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function signedNumber(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

export function SoftPriorAdvisoryBand({ advisory }: SoftPriorAdvisoryBandProps) {
  const isAvailable = advisory.status === "available";

  return (
    <section className="detail-section advisory-band" aria-labelledby="advisory-heading">
      <h3 id="advisory-heading">Advisory Pattern Signal</h3>
      <p className="boundary-note">Pattern signal only. Hard verdict remains deterministic.</p>

      {isAvailable ? (
        <div className="advisory-content">
          <dl className="field-grid">
            <div>
              <dt>Status</dt>
              <dd>{advisory.status}</dd>
            </div>
            <div>
              <dt>Dominant layer</dt>
              <dd>{advisory.assessment.dominantPriorLayer ?? "None"}</dd>
            </div>
            <div>
              <dt>Triggered drifts</dt>
              <dd>{formatList(advisory.assessment.triggeredDrifts)}</dd>
            </div>
          </dl>

          <p>{advisory.assessment.representativePatternSummary}</p>

          <div className="advisory-block">
            <h4>Contribution Evidence</h4>
            {advisory.assessment.contributions.length === 0 ? (
              <p>No contribution evidence.</p>
            ) : (
              <ol className="advisory-list">
                {advisory.assessment.contributions.map((contribution, index) => (
                  <li
                    key={`${contribution.layer}:${contribution.driftType}:${index}`}
                    className="advisory-item"
                  >
                    <div className="repair-heading">
                      <span>Contribution {index + 1}</span>
                      <span>{contribution.driftType}</span>
                    </div>
                    <p>{contribution.representativePatternSummary}</p>
                    <dl className="field-grid">
                      <div>
                        <dt>Layer</dt>
                        <dd>{contribution.layer}</dd>
                      </div>
                      <div>
                        <dt>Confidence</dt>
                        <dd>{formatNumber(contribution.confidence)}</dd>
                      </div>
                      <div>
                        <dt>Score</dt>
                        <dd>{formatNumber(contribution.score)}</dd>
                      </div>
                      <div>
                        <dt>Threshold</dt>
                        <dd>{formatNumber(contribution.threshold)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="advisory-block">
            <h4>Repair Plausibility Adjustments</h4>
            {advisory.repairPlausibilityAdjustments.length === 0 ? (
              <p>No repair plausibility adjustments.</p>
            ) : (
              <ol className="advisory-list">
                {advisory.repairPlausibilityAdjustments.map((adjustment) => (
                  <li key={adjustment.repairId} className="advisory-item">
                    <div className="repair-heading">
                      <span>{adjustment.repairId}</span>
                      <span>{signedNumber(adjustment.adjustment)}</span>
                    </div>
                    <p>{adjustment.representativePatternSummary}</p>
                    <dl className="field-grid">
                      <div>
                        <dt>Confidence</dt>
                        <dd>{formatNumber(adjustment.confidence)}</dd>
                      </div>
                      <div>
                        <dt>Dominant layer</dt>
                        <dd>{adjustment.dominantPriorLayer ?? "None"}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : (
        <div className="advisory-content">
          <p>Pattern signal unavailable. Deterministic verdict still applies.</p>
          <p>Reason: {advisory.reason}</p>
        </div>
      )}
    </section>
  );
}
