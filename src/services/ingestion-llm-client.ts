import { z } from "zod";

import {
  IngestionCandidateIdSchema,
  IngestionSessionIdSchema,
  IngestionSegmentIdSchema,
  StructuredCandidateKindSchema
} from "../domain/index.js";

const StructuredExtractionCandidateEnvelopeSchema = z.object({
  candidateId: IngestionCandidateIdSchema.optional(),
  candidateKind: StructuredCandidateKindSchema,
  canonicalKey: z.string().min(1),
  confidence: z.number().min(0).max(1),
  sourceSpanStart: z.number().int().nonnegative(),
  sourceSpanEnd: z.number().int().nonnegative(),
  provenanceDetail: z.record(z.string(), z.unknown()).default({}),
  payload: z.unknown()
});

export const StructuredExtractionEnvelopeSchema = z.object({
  candidates: z.array(StructuredExtractionCandidateEnvelopeSchema).default([])
});
export type StructuredExtractionEnvelope = z.infer<typeof StructuredExtractionEnvelopeSchema>;

export interface IngestionLlmClient {
  readonly modelName: string;
  extractSegment(input: {
    sessionId: string;
    segmentId: string;
    segmentText: string;
  }): Promise<StructuredExtractionEnvelope>;
}

interface CreateConfiguredIngestionLlmClientInput {
  modelName: string;
  extractor: (input: {
    sessionId: string;
    segmentId: string;
    segmentText: string;
  }) => Promise<StructuredExtractionEnvelope | unknown>;
}

export function createConfiguredIngestionLlmClient(
  input: CreateConfiguredIngestionLlmClientInput
): IngestionLlmClient {
  const modelName = z.string().min(1).parse(input.modelName);

  return {
    modelName,
    async extractSegment(segmentInput) {
      const parsedInput = z
        .object({
          sessionId: IngestionSessionIdSchema,
          segmentId: IngestionSegmentIdSchema,
          segmentText: z.string().min(1)
        })
        .parse(segmentInput);

      const result = await input.extractor(parsedInput);
      return StructuredExtractionEnvelopeSchema.parse(result);
    }
  };
}
