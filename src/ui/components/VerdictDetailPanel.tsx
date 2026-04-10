import { EvidenceSummary } from "./EvidenceSummary.js";
import { EvidenceTimeline } from "./EvidenceTimeline.js";
import { RepairCandidates } from "./RepairCandidates.js";
import { SoftPriorAdvisoryBand } from "./SoftPriorAdvisoryBand.js";
import { TraceFields } from "./TraceFields.js";
import type { InspectionVerdictDetail, VerdictKind } from "../types.js";

interface VerdictDetailPanelProps {
  detail: InspectionVerdictDetail | undefined;
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

function optionalField(value: string | null): string {
  return value ?? "None";
}

export function VerdictDetailPanel({ detail }: VerdictDetailPanelProps) {
  if (!detail) {
    return (
      <section className="detail-panel" aria-labelledby="detail-heading">
        <div className="selected-summary">
          <h2 id="detail-heading">Select a verdict</h2>
          <p>Choose a verdict from Verdict Triage.</p>
        </div>
      </section>
    );
  }

  const kindClassName = verdictKindClassName(detail.verdictKind);

  return (
    <section className="detail-panel" aria-labelledby="detail-heading">
      <div className="selected-summary">
        <span className={`verdict-badge ${kindClassName}`}>{detail.verdictKind}</span>
        <h2 id="detail-heading">{detail.explanation}</h2>
        <dl className="detail-metadata">
          <div>
            <dt>Verdict ID</dt>
            <dd>{detail.verdictId}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{detail.category}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{detail.createdAt}</dd>
          </div>
        </dl>
      </div>

      <section className="detail-section" aria-labelledby="deterministic-heading">
        <h3 id="deterministic-heading">Deterministic Verdict</h3>
        <p>{detail.deterministicVerdict.explanation}</p>
        <dl className="field-grid">
          <div>
            <dt>Verdict kind</dt>
            <dd>{detail.deterministicVerdict.verdictKind}</dd>
          </div>
          <div>
            <dt>Finding ID</dt>
            <dd>{optionalField(detail.deterministicVerdict.findingId)}</dd>
          </div>
          <div>
            <dt>Reason code</dt>
            <dd>{optionalField(detail.deterministicVerdict.reasonCode)}</dd>
          </div>
          <div>
            <dt>Checker</dt>
            <dd>{optionalField(detail.deterministicVerdict.representativeChecker)}</dd>
          </div>
        </dl>
      </section>

      <EvidenceSummary detail={detail} />
      <EvidenceTimeline timeline={detail.timeline} />
      <TraceFields trace={detail.trace} />
      <RepairCandidates repairs={detail.repairs} />
      <SoftPriorAdvisoryBand advisory={detail.advisory} />
    </section>
  );
}
