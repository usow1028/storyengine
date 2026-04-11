export interface InspectionFilterState {
  groupKey: string;
  reviewState: string;
  segmentId: string;
}

export interface InspectionFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface InspectionFilterOptions {
  groups: InspectionFilterOption[];
  reviewStates: InspectionFilterOption[];
  segments: InspectionFilterOption[];
}

interface InspectionFilterBarProps {
  filters: InspectionFilterState;
  options: InspectionFilterOptions;
  onChange: (nextFilters: InspectionFilterState) => void;
}

function renderOption(option: InspectionFilterOption) {
  return (
    <option key={option.value} value={option.value}>
      {option.label} ({option.count})
    </option>
  );
}

export function InspectionFilterBar({
  filters,
  options,
  onChange
}: InspectionFilterBarProps) {
  return (
    <form className="inspection-filter-bar" aria-label="Inspection filters">
      <label className="inspection-filter-control">
        <span>Chapter or section filter</span>
        <select
          aria-label="Chapter or section filter"
          value={filters.groupKey}
          onChange={(event) =>
            onChange({
              ...filters,
              groupKey: event.target.value
            })
          }
        >
          {options.groups.map(renderOption)}
        </select>
      </label>

      <label className="inspection-filter-control">
        <span>Review state filter</span>
        <select
          aria-label="Review state filter"
          value={filters.reviewState}
          onChange={(event) =>
            onChange({
              ...filters,
              reviewState: event.target.value
            })
          }
        >
          {options.reviewStates.map(renderOption)}
        </select>
      </label>

      <label className="inspection-filter-control">
        <span>Segment filter</span>
        <select
          aria-label="Segment filter"
          value={filters.segmentId}
          onChange={(event) =>
            onChange({
              ...filters,
              segmentId: event.target.value
            })
          }
        >
          {options.segments.map(renderOption)}
        </select>
      </label>
    </form>
  );
}
