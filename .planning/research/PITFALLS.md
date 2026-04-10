# Pitfalls Research: v1.1 Draft Scale

## Pitfall 1: Blob-Scale Ingestion

If v1.1 treats a chapter as one large text blob, review and traceability will degrade. Segment boundaries must be first-class and deterministic enough that verdicts can point back to stable source spans.

Mitigation:

- Store ordered document/chapter/segment metadata.
- Keep offsets and labels through extraction, correction, promotion, verdicts, and inspection.
- Test segmentation stability with headings, blank lines, and long paragraphs.

## Pitfall 2: Premature Canonical Promotion

Approving one segment must not imply all extracted candidates are safe. A failed or uncertain later segment should not corrupt canonical state or unlock a misleading full-draft check.

Mitigation:

- Require explicit approved scope for checks.
- Track partial approval separately from full approval.
- Keep promotion idempotent and provenance-backed.

## Pitfall 3: Misleading Revision Diffs

Diffing two runs without scope and revision metadata can make findings look resolved or new when the checked text range simply changed.

Mitigation:

- Persist check scope on verdict runs or inspection snapshots.
- Include revision pair and segment range in diff output.
- Label out-of-scope findings separately from resolved findings.

## Pitfall 4: Hidden Batch Failures

Batch extraction over many segments can partially fail. If failure state is not explicit, users will assume the draft was fully analyzed.

Mitigation:

- Persist per-segment extraction status and error summaries.
- Allow retry for failed or stale segments.
- Keep check execution blocked or scoped when unresolved segments remain.

## Pitfall 5: Inspection Overload

A chapter can produce many findings. A single flat verdict list will become noisy.

Mitigation:

- Add grouping and filtering before adding more visual complexity.
- Preserve the existing fixed verdict-kind ordering.
- Add source-scope summaries and counts.

## Pitfall 6: Advisory Priors Becoming Law

Corpus priors are useful for repair ordering, but draft-scale workflows can make pattern frequency feel authoritative.

Mitigation:

- Keep advisory copy and schema separate from hard verdict fields.
- Test that prior availability changes repair order or annotations only, not verdict kind.
- Surface unavailable or insufficient-prior states clearly.

## Pitfall 7: Too Much Product Surface

Collaboration, export, editor integration, real-time checks, and format packs are all plausible future directions. Adding them in v1.1 would dilute the core scale problem.

Mitigation:

- Keep v1.1 focused on single-writer draft-scale analysis.
- Defer sharing, permissions, export, and live editor UX.
- Use the browser inspection surface only where it proves larger-run triage.
