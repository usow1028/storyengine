import type { InspectionVerdictDetail } from "../types.js";

interface EvidenceSummaryProps {
  detail: InspectionVerdictDetail;
}

function formatTextList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "None";
}

function formatValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return null;
}

function formatStateValues(values: Record<string, unknown>): string {
  const formatted = Object.entries(values)
    .map(([key, value]) => {
      const rendered = formatValue(value);
      return rendered ? `${key}: ${rendered}` : null;
    })
    .filter((value): value is string => Boolean(value));

  return formatted.length > 0 ? formatted.join("; ") : "No state values";
}

export function EvidenceSummary({ detail }: EvidenceSummaryProps) {
  return (
    <section className="detail-section" aria-labelledby="evidence-heading">
      <h3 id="evidence-heading">Evidence Summary</h3>
      <p>{detail.evidenceSummary.summary}</p>

      <dl className="evidence-counts">
        <div>
          <dt>Events</dt>
          <dd>{detail.evidenceSummary.eventCount}</dd>
        </div>
        <div>
          <dt>States</dt>
          <dd>{detail.evidenceSummary.stateCount}</dd>
        </div>
        <div>
          <dt>Rules</dt>
          <dd>{detail.evidenceSummary.ruleCount}</dd>
        </div>
        <div>
          <dt>Missing premises</dt>
          <dd>{detail.evidenceSummary.missingPremiseCount}</dd>
        </div>
        <div>
          <dt>Supporting findings</dt>
          <dd>{detail.evidenceSummary.supportingFindingCount}</dd>
        </div>
      </dl>

      <div className="evidence-block">
        <h4>Events</h4>
        {detail.eventSummaries.length > 0 ? (
          <ul className="evidence-list">
            {detail.eventSummaries.map((event) => (
              <li key={event.eventId}>
                <span className="evidence-title">{event.eventType}</span>
                <span>
                  {event.eventId} - sequence {event.sequence} - {event.timeRelation}
                </span>
                <span>Actors: {formatTextList(event.actorIds)}</span>
                <span>Targets: {formatTextList(event.targetIds)}</span>
                <span>Place: {event.placeId ?? "None"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No linked events.</p>
        )}
      </div>

      <div className="evidence-block">
        <h4>States</h4>
        {detail.stateSummaries.length > 0 ? (
          <ul className="evidence-list">
            {detail.stateSummaries.map((state) => (
              <li key={state.stateBoundaryId ?? state.characterId}>
                <span className="evidence-title">{state.characterId}</span>
                <span>Boundary: {state.stateBoundaryId ?? "None"}</span>
                <span>Axes: {formatTextList(state.relevantAxes)}</span>
                <span>{formatStateValues(state.values)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No linked states.</p>
        )}
      </div>

      <div className="evidence-block">
        <h4>Rules</h4>
        {detail.ruleSummaries.length > 0 ? (
          <ul className="evidence-list">
            {detail.ruleSummaries.map((rule) => (
              <li key={rule.ruleVersionId ?? rule.rulePackId}>
                <span className="evidence-title">{rule.name}</span>
                <span>Scope: {rule.scope}</span>
                <span>World: {rule.worldAffiliation}</span>
                <span>Active: {rule.active ? "true" : "false"}</span>
                <span>Effects: {formatTextList(rule.effects)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No linked rules.</p>
        )}
      </div>
    </section>
  );
}
