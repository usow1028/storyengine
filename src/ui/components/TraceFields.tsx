import { useState } from "react";

import type { InspectionVerdictDetail } from "../types.js";

const TRACE_FIELD_LIMIT = 6;

interface TraceFieldsProps {
  trace: InspectionVerdictDetail["trace"];
}

function formatScalar(value: string | null): string {
  return value ?? "None";
}

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatUnknown).join(", ") : "None";
  }

  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${formatUnknown(entryValue)}`)
      .join("; ");

    return entries.length > 0 ? entries : "None";
  }

  return "None";
}

function hasHiddenRows(values: unknown[]): boolean {
  return values.length > TRACE_FIELD_LIMIT;
}

function TraceArrayField({
  label,
  values,
  showAll
}: {
  label: string;
  values: unknown[];
  showAll: boolean;
}) {
  const visibleValues = showAll ? values : values.slice(0, TRACE_FIELD_LIMIT);

  return (
    <div className="trace-field">
      <dt>{label}</dt>
      <dd>
        {values.length === 0 ? (
          <span>None</span>
        ) : (
          <ol className="trace-values">
            {visibleValues.map((value, index) => (
              <li key={`${label}:${index}`}>{formatUnknown(value)}</li>
            ))}
          </ol>
        )}
      </dd>
    </div>
  );
}

export function TraceFields({ trace }: TraceFieldsProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAllTraceFields, setShowAllTraceFields] = useState(false);
  const arrayFields = [
    trace.conflictPath,
    trace.eventIds,
    trace.stateBoundaryIds,
    trace.ruleVersionIds,
    trace.provenanceIds,
    trace.missingPremises,
    trace.supportingFindings,
    trace.notEvaluated
  ];
  const hasMoreTraceFields = arrayFields.some(hasHiddenRows);

  return (
    <section className="detail-section trace-section" aria-labelledby="trace-heading">
      <div className="section-heading-row">
        <h3 id="trace-heading">Structured Trace</h3>
        <button
          className="trace-toggle"
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide Structured Trace" : "Show Structured Trace"}
        </button>
      </div>

      {expanded ? (
        <div className="trace-content">
          <dl className="field-grid trace-scalars">
            <div>
              <dt>Finding ID</dt>
              <dd>{formatScalar(trace.findingId)}</dd>
            </div>
            <div>
              <dt>Reason code</dt>
              <dd>{formatScalar(trace.reasonCode)}</dd>
            </div>
            <div>
              <dt>Checker</dt>
              <dd>{formatScalar(trace.representativeChecker)}</dd>
            </div>
          </dl>

          <dl className="trace-grid">
            <TraceArrayField
              label="Conflict path"
              values={trace.conflictPath}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="Missing premises"
              values={trace.missingPremises}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="Supporting findings"
              values={trace.supportingFindings}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="Event IDs"
              values={trace.eventIds}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="State boundary IDs"
              values={trace.stateBoundaryIds}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="Rule version IDs"
              values={trace.ruleVersionIds}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="Provenance IDs"
              values={trace.provenanceIds}
              showAll={showAllTraceFields}
            />
            <TraceArrayField
              label="Not evaluated"
              values={trace.notEvaluated}
              showAll={showAllTraceFields}
            />
          </dl>

          {hasMoreTraceFields && !showAllTraceFields ? (
            <button
              className="trace-more"
              type="button"
              onClick={() => setShowAllTraceFields(true)}
            >
              Show More Trace Fields
            </button>
          ) : null}
        </div>
      ) : (
        <p>Trace fields are collapsed until needed.</p>
      )}
    </section>
  );
}
