export const ReasonCodes = {
  time: {
    travelDurationOk: "travel_duration_ok",
    invalidTemporalAnchor: "invalid_temporal_anchor",
    impossibleTravel: "impossible_travel"
  },
  space: {
    missingLocationContext: "missing_location_context",
    impossibleTravel: "impossible_travel"
  },
  physics: {
    physicalRuleBlocked: "physical_rule_blocked",
    ruleOverrideRequired: "rule_override_required"
  },
  causality: {
    missingCausalLink: "missing_causal_link",
    insufficientStateTransition: "insufficient_state_transition"
  },
  character: {
    loyaltyReversalWithoutCause: "loyalty_reversal_without_cause",
    missingCharacterContext: "missing_character_context"
  }
} as const;

export const AllReasonCodes = Object.values(ReasonCodes).flatMap((group) => Object.values(group));
