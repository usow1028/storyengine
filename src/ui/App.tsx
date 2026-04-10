import { useEffect, useMemo, useState } from "react";

import { InspectionShell } from "./components/InspectionShell.js";
import { fetchRunInspection } from "./inspection-client.js";
import type { RunInspectionResponse } from "./types.js";

const INSPECTION_RUN_PREFIX = "/inspection/runs/";
const ERROR_COPY = "Inspection run could not load. Check the run ID and try again.";

type LoadState =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "loaded"; data: RunInspectionResponse }
  | { status: "error" };

export function parseInspectionRunId(pathname: string): string | null {
  if (!pathname.startsWith(INSPECTION_RUN_PREFIX)) {
    return null;
  }

  const [encodedRunId] = pathname.slice(INSPECTION_RUN_PREFIX.length).split("/");
  if (!encodedRunId) {
    return null;
  }

  try {
    return decodeURIComponent(encodedRunId);
  } catch {
    return encodedRunId;
  }
}

export function App() {
  const runId = useMemo(() => parseInspectionRunId(window.location.pathname), []);
  const [loadState, setLoadState] = useState<LoadState>(
    runId ? { status: "loading" } : { status: "empty" }
  );

  useEffect(() => {
    if (!runId) {
      setLoadState({ status: "empty" });
      return;
    }

    let active = true;
    setLoadState({ status: "loading" });

    fetchRunInspection(runId)
      .then((data) => {
        if (active) {
          setLoadState({ status: "loaded", data });
        }
      })
      .catch(() => {
        if (active) {
          setLoadState({ status: "error" });
        }
      });

    return () => {
      active = false;
    };
  }, [runId]);

  if (loadState.status === "empty") {
    return (
      <main className="inspection-state" aria-labelledby="inspection-title">
        <h1 id="inspection-title">Inspection Console</h1>
        <section aria-labelledby="empty-heading">
          <h2 id="empty-heading">No consistency run selected</h2>
          <p>Run a consistency check, then open the inspection run.</p>
        </section>
      </main>
    );
  }

  if (loadState.status === "loading") {
    return (
      <main className="inspection-state" aria-labelledby="inspection-title" aria-busy="true">
        <h1 id="inspection-title">Inspection Console</h1>
        <p>Loading inspection run.</p>
      </main>
    );
  }

  if (loadState.status === "error") {
    return (
      <main className="inspection-state" aria-labelledby="inspection-title">
        <h1 id="inspection-title">Inspection Console</h1>
        <p role="alert">{ERROR_COPY}</p>
      </main>
    );
  }

  return <InspectionShell data={loadState.data} />;
}
