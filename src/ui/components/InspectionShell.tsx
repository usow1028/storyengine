import { useEffect, useMemo, useState } from "react";

import { VerdictDetailPanel } from "./VerdictDetailPanel.js";
import { VerdictTriageList } from "./VerdictTriageList.js";
import type { RunInspectionResponse } from "../types.js";

interface InspectionShellProps {
  data: RunInspectionResponse;
}

function firstVerdictId(data: RunInspectionResponse): string | null {
  for (const group of data.groups) {
    const verdict = group.verdicts[0];
    if (verdict) {
      return verdict.verdictId;
    }
  }

  return null;
}

function preferredVerdictId(data: RunInspectionResponse): string | null {
  if (data.selectedVerdictId && data.detailsByVerdictId[data.selectedVerdictId]) {
    return data.selectedVerdictId;
  }

  return firstVerdictId(data);
}

export function InspectionShell({ data }: InspectionShellProps) {
  const defaultVerdictId = useMemo(() => preferredVerdictId(data), [data]);
  const [selectedVerdictId, setSelectedVerdictId] = useState<string | null>(
    defaultVerdictId
  );

  useEffect(() => {
    if (selectedVerdictId && data.detailsByVerdictId[selectedVerdictId]) {
      return;
    }

    setSelectedVerdictId(defaultVerdictId);
  }, [data.detailsByVerdictId, defaultVerdictId, selectedVerdictId]);

  const selectedDetail = selectedVerdictId
    ? data.detailsByVerdictId[selectedVerdictId]
    : undefined;

  return (
    <main className="inspection-console" aria-labelledby="inspection-title">
      <header className="inspection-header">
        <div>
          <h1 id="inspection-title">Inspection Console</h1>
        </div>
        <dl className="run-metadata" aria-label="Inspection run metadata">
          <div>
            <dt>Run</dt>
            <dd>{data.run.runId}</dd>
          </div>
          <div>
            <dt>Story</dt>
            <dd>{data.run.storyId}</dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>{data.run.revisionId}</dd>
          </div>
          <div>
            <dt>Trigger</dt>
            <dd>{data.run.triggerKind}</dd>
          </div>
          {data.run.previousRunId ? (
            <div>
              <dt>Previous</dt>
              <dd>{data.run.previousRunId}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="inspection-layout">
        <VerdictTriageList
          groups={data.groups}
          selectedVerdictId={selectedVerdictId}
          onSelectVerdict={setSelectedVerdictId}
        />
        <VerdictDetailPanel detail={selectedDetail} />
      </div>
    </main>
  );
}
