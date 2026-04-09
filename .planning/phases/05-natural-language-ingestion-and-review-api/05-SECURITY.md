---
phase: 05
slug: natural-language-ingestion-and-review-api
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-10
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Natural-language prose -> advisory ingestion session | Freeform chunk or full-draft text crosses into deterministic segmentation and extraction services and must not become canonical truth during submit or extract. | raw prose, draft targeting IDs, workflow state, advisory segment and candidate records |
| Extraction output -> review-session storage | Advisory candidates cross into durable ingestion storage and must keep provenance, confidence, and review-needed reasons for later audit and correction. | prompt family, model name, source spans, provenance detail, extracted payload, corrected payload, normalized payload |
| Structured review patch -> review repository | Client-driven boundary edits and candidate corrections cross into persistent review state and must not erase extracted originals or bypass normalization checks. | segment boundary patches, corrected structured payloads, recomputed normalized payloads, review-needed flags |
| Approved segment -> canonical repositories and manual verdict execution | Only approved segment data may cross from ingestion storage into canonical story, rule, provenance, and verdict records, and manual checks must remain explicit. | approved canonical payloads, provenance references, verdict trigger intent, verdict run IDs and timestamps |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Tampering | `submitIngestionSession` and `extractIngestionSession` | mitigate | [ingestion-session.ts](/home/usow/Desktop/storyenginelogic/src/services/ingestion-session.ts) persists submit/extract output only through `IngestionSessionRepository.createSession`, `saveSegments`, and `saveExtractionBatch`; it does not call canonical repositories or `executeVerdictRun`, and [ingestion-review-api.test.ts](/home/usow/Desktop/storyenginelogic/tests/api/ingestion-review-api.test.ts) exercises submit/extract/read without canonical promotion. | closed |
| T-05-02 | Repudiation | `ingestion_candidates` provenance trail | mitigate | [0003_ingestion_review.sql](/home/usow/Desktop/storyenginelogic/src/storage/migrations/0003_ingestion_review.sql) stores `prompt_family`, `model_name`, source spans, `provenance_detail`, `extracted_payload`, `corrected_payload`, `normalized_payload`, and review-needed fields; [ingestion-session.ts](/home/usow/Desktop/storyenginelogic/src/services/ingestion-session.ts) populates `low_confidence`, `conflicting_candidates`, and `normalization_failed`; repository and extraction regressions keep those fields round-trippable. | closed |
| T-05-03 | Tampering | `applySegmentPatch` | mitigate | [ingestion-review.ts](/home/usow/Desktop/storyenginelogic/src/services/ingestion-review.ts) parses `ReviewSegmentPatchSchema` before delegation, and [ingestion-session-repository.ts](/home/usow/Desktop/storyenginelogic/src/storage/repositories/ingestion-session-repository.ts) writes `corrected_payload` separately, recomputes `normalized_payload`, and leaves `extracted_payload` intact; [ingestion-review-workflow.test.ts](/home/usow/Desktop/storyenginelogic/tests/services/ingestion-review-workflow.test.ts) and [ingestion-session-repository.test.ts](/home/usow/Desktop/storyenginelogic/tests/storage/ingestion-session-repository.test.ts) assert that corrected data does not overwrite extracted originals. | closed |
| T-05-04 | Elevation of Privilege | `approveReviewedSegment` canonical promotion | mitigate | [ingestion-review.ts](/home/usow/Desktop/storyenginelogic/src/services/ingestion-review.ts) approves one segment at a time, rejects unresolved candidates, promotes only the targeted approved segment, and routes writes through `StoryRepository`, `RuleRepository`, and `ProvenanceRepository`; [ingestion-review-workflow.test.ts](/home/usow/Desktop/storyenginelogic/tests/services/ingestion-review-workflow.test.ts) proves approved Alice data is promoted while unapproved Bob data is not. | closed |
| T-05-05 | Repudiation | `POST /api/ingestion/submissions/:sessionId/check` | mitigate | [ingestion-check.ts](/home/usow/Desktop/storyenginelogic/src/services/ingestion-check.ts) blocks non-`approved` sessions, calls `executeVerdictRun` only from the explicit manual check path, then persists `lastVerdictRunId`, `lastCheckedAt`, and `checked`; [check-controls-api.test.ts](/home/usow/Desktop/storyenginelogic/tests/api/check-controls-api.test.ts) proves `409` before approval and exactly one verdict run after the manual request. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-10 | 5 | 5 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-10
