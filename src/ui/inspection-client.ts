import type { RunInspectionResponse } from "./types.js";

const LOAD_ERROR_MESSAGE = "Inspection run could not load.";

export async function fetchRunInspection(runId: string): Promise<RunInspectionResponse> {
  const response = await fetch(`/api/inspection/runs/${encodeURIComponent(runId)}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(LOAD_ERROR_MESSAGE);
  }

  return (await response.json()) as RunInspectionResponse;
}
