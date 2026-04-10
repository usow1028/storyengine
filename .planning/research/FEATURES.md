# Feature Research: v1.1 Draft Scale

## Product Direction

v1.1 should turn the v1.0 consistency loop into a chapter-scale drafting workflow:

1. A writer submits a chapter or ordered draft excerpt.
2. StoryGraph creates a deterministic segment plan.
3. Extraction runs segment by segment.
4. The writer reviews and approves structured candidates incrementally.
5. Checks run against approved scope.
6. Revision diffs explain what became newly inconsistent, resolved, or unchanged.

This is the most direct next milestone because v1.0 already proved the canonical graph, hard checks, soft-prior advisory layer, natural-language review path, and inspection surface. The next risk is scale and continuity, not collaboration or export.

## Core User Outcomes

Writers should be able to:

- Submit chapter-scale text without manually splitting it into structured events.
- See how the draft was segmented before approving extracted structure.
- Review extracted entities, events, state boundaries, causal links, and rules by segment.
- Approve safe segments while leaving uncertain segments unresolved.
- Run consistency checks only for approved draft scope.
- Compare a new draft revision against a previous revision or previous check run.
- Inspect verdicts without losing the source text span that produced each finding.

## Table Stakes

- Segment labels and order must be stable.
- Source offsets must survive extraction, correction, approval, promotion, check, and inspection.
- Partial approval must not mark the whole session safe to check.
- Scope selection must be explicit: full approved draft, chapter, segment range, or revision pair.
- Diffs must distinguish added, resolved, persisted, and changed findings.
- Advisory soft priors must stay advisory and never change hard verdict truth.

## Differentiators

- StoryGraph can show why a full chapter is inconsistent through structured trace fields, not generic comments.
- Writers can approve the canonical interpretation before the engine judges it.
- Revision diffing can explain whether an edit fixed a contradiction or merely moved it.
- Larger-run inspection can group by severity, chapter, segment, entity, rule, and unresolved review state.

## Anti-Features

Do not add these to v1.1:

- Multi-user collaboration.
- Export to screenplay, novel, or outline formats.
- Real-time checking while typing.
- Automatic rewrite generation.
- Style scoring or prose quality feedback.
- Background manuscript ingestion that hides segment-level review state.

## Success Criteria

- A multi-segment full-draft submission can be extracted, reviewed, partially approved, fully approved, checked, and inspected.
- A second revision can be submitted and compared against the prior revision or prior verdict run.
- Check output clearly identifies selected scope and source provenance.
- Large-run UI/API responses remain structured and triageable.
- Tests cover happy path, partial approval, failed segment extraction, rerun, and revision diff.
