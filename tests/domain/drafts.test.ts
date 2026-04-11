import { describe, expect, it } from "vitest";

import {
  DraftCheckScopeSchema,
  DraftSourceTextRefSchema
} from "../../src/domain/drafts.js";

describe("draft domain contracts", () => {
  it("validates source text refs and rejects reversed offsets", () => {
    const valid = DraftSourceTextRefSchema.parse({
      sourceKind: "ingestion_session_raw_text",
      sessionId: "session:chapter-scale",
      startOffset: 0,
      endOffset: 18,
      textNormalization: "lf"
    });

    expect(valid).toMatchObject({
      sourceKind: "ingestion_session_raw_text",
      sessionId: "session:chapter-scale",
      textNormalization: "lf"
    });

    expect(() =>
      DraftSourceTextRefSchema.parse({
        sourceKind: "ingestion_session_raw_text",
        sessionId: "session:chapter-scale",
        startOffset: 19,
        endOffset: 18,
        textNormalization: "lf"
      })
    ).toThrow(/startOffset/i);
  });

  it("validates full draft, section, and contiguous segment range scopes", () => {
    const sourceTextRef = DraftSourceTextRefSchema.parse({
      sourceKind: "ingestion_session_raw_text",
      sessionId: "session:chapter-scale",
      startOffset: 0,
      endOffset: 22,
      textNormalization: "lf"
    });

    expect(
      DraftCheckScopeSchema.parse({
        scopeKind: "full_approved_draft",
        scopeId: "draft-scope:session:chapter-scale:full",
        documentId: "draft-document:session:chapter-scale",
        draftRevisionId: "draft-revision:session:chapter-scale",
        storyId: "story:chapter-scale",
        revisionId: "revision:chapter-scale"
      }).scopeKind
    ).toBe("full_approved_draft");

    expect(
      DraftCheckScopeSchema.parse({
        scopeKind: "section",
        scopeId: "draft-scope:session:chapter-scale:section:1",
        documentId: "draft-document:session:chapter-scale",
        draftRevisionId: "draft-revision:session:chapter-scale",
        sectionId: "draft-section:session:chapter-scale:1",
        sourceTextRef
      }).scopeKind
    ).toBe("section");

    expect(
      DraftCheckScopeSchema.parse({
        scopeKind: "segment_range",
        scopeId: "draft-scope:session:chapter-scale:segment-range:1-2",
        documentId: "draft-document:session:chapter-scale",
        draftRevisionId: "draft-revision:session:chapter-scale",
        startSegmentId: "segment:session:chapter-scale:1",
        endSegmentId: "segment:session:chapter-scale:2",
        startSequence: 0,
        endSequence: 1,
        sectionId: "draft-section:session:chapter-scale:1",
        sourceTextRef
      }).scopeKind
    ).toBe("segment_range");

    expect(() =>
      DraftCheckScopeSchema.parse({
        scopeKind: "segment_range",
        scopeId: "draft-scope:session:chapter-scale:segment-range:2-1",
        documentId: "draft-document:session:chapter-scale",
        draftRevisionId: "draft-revision:session:chapter-scale",
        startSegmentId: "segment:session:chapter-scale:2",
        endSegmentId: "segment:session:chapter-scale:1",
        startSequence: 2,
        endSequence: 1
      })
    ).toThrow(/startSequence/i);
  });

  it("rejects unsupported arbitrary scope kinds", () => {
    expect(() =>
      DraftCheckScopeSchema.parse({
        scopeKind: "entity",
        scopeId: "draft-scope:session:chapter-scale:entity:alice",
        documentId: "draft-document:session:chapter-scale",
        draftRevisionId: "draft-revision:session:chapter-scale",
        entityId: "character:alice"
      })
    ).toThrow(/scopeKind/i);
  });
});
