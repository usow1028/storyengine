import { HardConstraintEvaluationSchema, type HardConstraintEvaluation } from "./types.js";
import type { NotEvaluatedFinding, SupportingFinding, VerdictKind } from "../domain/index.js";

const SEVERITY_ORDER: Record<VerdictKind, number> = {
  "Hard Contradiction": 4,
  "Repairable Gap": 3,
  "Soft Drift": 2,
  Consistent: 1
};

const CHECKER_ORDER: Record<SupportingFinding["checker"], number> = {
  time: 1,
  space: 2,
  physics: 3,
  causality: 4,
  character: 5
};

export function aggregateFindings(input: {
  findings: SupportingFinding[];
  notEvaluated: NotEvaluatedFinding[];
}): HardConstraintEvaluation {
  const sortedFindings = [...input.findings].sort((left, right) => {
    const severityDiff = SEVERITY_ORDER[right.verdictKind] - SEVERITY_ORDER[left.verdictKind];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return CHECKER_ORDER[left.checker] - CHECKER_ORDER[right.checker];
  });

  const representative = sortedFindings[0];
  if (!representative) {
    return HardConstraintEvaluationSchema.parse({
      verdictKind: "Consistent",
      explanation: "No hard-constraint findings were produced for this evaluation.",
      findings: [],
      notEvaluated: input.notEvaluated
    });
  }

  return HardConstraintEvaluationSchema.parse({
    verdictKind: representative.verdictKind,
    category: representative.category,
    explanation: representative.explanation,
    representativeChecker: representative.checker,
    reasonCode: representative.reasonCode,
    findings: sortedFindings,
    notEvaluated: input.notEvaluated
  });
}
