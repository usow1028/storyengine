---
phase: 08-interactive-inspection-surface
reviewed: 2026-04-10T10:39:41Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - src/api/app.ts
  - src/api/routes/inspection-ui.ts
  - src/api/routes/inspection.ts
  - src/api/schemas.ts
  - src/domain/index.ts
  - src/domain/inspection.ts
  - src/services/index.ts
  - src/services/inspection-payload.ts
  - src/services/verdict-runner.ts
  - src/storage/migrations/0004_verdict_run_inspection_snapshot.sql
  - src/storage/repositories/verdict-run-repository.ts
  - src/ui/App.tsx
  - src/ui/components/EvidenceSummary.tsx
  - src/ui/components/EvidenceTimeline.tsx
  - src/ui/components/InspectionShell.tsx
  - src/ui/components/RepairCandidates.tsx
  - src/ui/components/SoftPriorAdvisoryBand.tsx
  - src/ui/components/TraceFields.tsx
  - src/ui/components/VerdictDetailPanel.tsx
  - src/ui/components/VerdictTriageList.tsx
  - src/ui/inspection-client.ts
  - src/ui/main.tsx
  - src/ui/styles.css
  - src/ui/types.ts
  - tests/api/inspection-api.test.ts
  - tests/browser/inspection-surface.spec.ts
  - tests/browser/inspection-test-server.ts
  - tests/engine/verdict-runner.test.ts
  - tests/services/inspection-payload.test.ts
  - tests/storage/verdict-run-inspection-snapshot.test.ts
  - tests/ui/inspection-shell.test.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-10T10:39:41Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Reviewed the inspection API, inspection DTO shaping, verdict-run snapshot persistence, React inspection console, browser/server test harness, and related storage/API/UI tests. The implementation keeps deterministic verdict data separated from advisory prior data and avoids raw HTML injection, but the repair list shown in the selected verdict detail does not apply the stored soft-prior rerank order.

Verification run during review:

- `npm run typecheck` passed.
- `npm run test -- tests/api/inspection-api.test.ts tests/engine/verdict-runner.test.ts tests/services/inspection-payload.test.ts tests/storage/verdict-run-inspection-snapshot.test.ts tests/ui/inspection-shell.test.ts` passed: 5 files, 19 tests.
- `npm run build:ui -- --outDir /tmp/storygraph-ui-review-build` passed.
- `npm run test:browser` passed: 1 Chromium test.

## Warnings

### WR-01: Soft-Prior Rerank Is Not Applied to Displayed Repair Ranks

**File:** `src/services/inspection-payload.ts:115`

**Issue:** `repairsForVerdict` filters `snapshot.repairCandidates`, which is the original generated repair order. The snapshot also stores `snapshot.advisory.rerankedRepairs`, but that list is never used when shaping `detail.repairs`. Because `RepairCandidates` labels entries as `Rank {index + 1}` at `src/ui/components/RepairCandidates.tsx:22`, the UI can show deterministic/base ranks even when the soft-prior runtime has reranked repair options. This loses the main advisory effect while still displaying plausibility adjustments.

The current tests only cover one matching repair for a verdict, so they cannot catch an order mismatch between `repairCandidates` and `advisory.rerankedRepairs`.

**Fix:** Use advisory reranked repairs as the display source when the advisory is available, then filter by the selected verdict finding and attach adjustments. Add a regression test with two repairs for the same `sourceFindingIds` where `advisory.rerankedRepairs` reverses the raw order.

```ts
function orderedRepairsForSnapshot(snapshot: RunInspectionSnapshot): RepairCandidate[] {
  if (
    snapshot.advisory.status === "available" &&
    snapshot.advisory.rerankedRepairs.length > 0
  ) {
    return snapshot.advisory.rerankedRepairs;
  }

  return snapshot.repairCandidates;
}

function repairsForVerdict(
  verdict: VerdictRecord,
  snapshot: RunInspectionSnapshot | undefined
): InspectionRepairCandidate[] {
  const findingId = findingIdFor(verdict);
  if (!findingId || !snapshot) {
    return [];
  }

  const adjustmentsByRepairId = new Map<string, RepairPlausibilityAdjustment>(
    snapshot.advisory.repairPlausibilityAdjustments.map((adjustment) => [
      adjustment.repairId,
      adjustment
    ])
  );

  return orderedRepairsForSnapshot(snapshot)
    .filter((repair) => repair.sourceFindingIds.includes(findingId))
    .map((repair) => ({
      ...repair,
      plausibilityAdjustment: adjustmentsByRepairId.get(repair.repairId) ?? null
    }));
}
```

---

_Reviewed: 2026-04-10T10:39:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
