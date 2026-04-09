import type { RepairType } from "../domain/index.js";

export interface RepairCatalogEntry {
  repairTypes: RepairType[];
  bundleCapable: boolean;
}

export const RepairCatalog: Record<string, RepairCatalogEntry> = {
  missing_causal_link: {
    repairTypes: ["add_missing_assumption", "add_prior_event"],
    bundleCapable: false
  },
  insufficient_state_transition: {
    repairTypes: ["add_missing_assumption", "add_prior_event"],
    bundleCapable: false
  },
  impossible_travel: {
    repairTypes: ["declare_rule", "add_prior_event", "repair_bundle"],
    bundleCapable: true
  },
  rule_override_required: {
    repairTypes: ["declare_rule", "add_prior_event"],
    bundleCapable: true
  },
  character_state_contradiction: {
    repairTypes: ["add_missing_assumption", "add_prior_event"],
    bundleCapable: false
  },
  loyalty_reversal_without_cause: {
    repairTypes: ["add_missing_assumption", "add_prior_event"],
    bundleCapable: false
  },
  missing_location_context: {
    repairTypes: ["add_missing_assumption", "add_prior_event"],
    bundleCapable: false
  }
};

export function resolveRepairCatalogEntry(reasonCode: string, category?: string) {
  return RepairCatalog[reasonCode] ?? (category ? RepairCatalog[category] : undefined);
}
