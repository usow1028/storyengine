import type { InspectionVerdictDetail } from "../types.js";

interface EvidenceTimelineProps {
  timeline: InspectionVerdictDetail["timeline"];
}

function formatList(values: string[], emptyText: string): string {
  return values.length > 0 ? values.join(", ") : emptyText;
}

export function EvidenceTimeline({ timeline }: EvidenceTimelineProps) {
  const orderedTimeline = [...timeline].sort(
    (left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId)
  );

  return (
    <section className="detail-section timeline-section" aria-labelledby="timeline-heading">
      <h3 id="timeline-heading">Event Timeline</h3>
      {orderedTimeline.length === 0 ? (
        <p>No linked timeline events.</p>
      ) : (
        <ol className="timeline-list">
          {orderedTimeline.map((item) => (
            <li key={`${item.sequence}:${item.eventId}`} className="timeline-item">
              <span className="timeline-marker" aria-hidden="true">
                {item.sequence}
              </span>
              <div className="timeline-copy">
                <div className="timeline-heading">
                  <h4>{item.summary}</h4>
                  <span>Sequence {item.sequence}</span>
                </div>
                <dl className="field-grid timeline-fields">
                  <div>
                    <dt>Event ID</dt>
                    <dd>{item.eventId}</dd>
                  </div>
                  <div>
                    <dt>Event type</dt>
                    <dd>{item.eventType}</dd>
                  </div>
                  <div>
                    <dt>Time relation</dt>
                    <dd>{item.timeRelation}</dd>
                  </div>
                  <div>
                    <dt>Place</dt>
                    <dd>{item.placeId ?? "None"}</dd>
                  </div>
                  <div>
                    <dt>State boundaries</dt>
                    <dd>
                      {formatList(
                        item.relatedStateBoundaryIds,
                        "No linked state boundaries."
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Rule versions</dt>
                    <dd>
                      {formatList(item.relatedRuleVersionIds, "No linked rule versions.")}
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
