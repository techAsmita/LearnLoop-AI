const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  } catch (err) {
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Is uvicorn running? (${
        err instanceof Error ? err.message : "network error"
      })`
    );
  }

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `API ${res.status}: ${text.slice(0, 300)}`
    );
  }

  return res.json();
}

export const api = {
  health: () =>
    request<{
      status: string;
      mock_mode: boolean;
    }>("/api/health"),

  listConcepts: () =>
    request<import("@/types").Concept[]>(
      "/api/concepts"
    ),

  getConcept: (conceptId: string) =>
    request<import("@/types").ConceptDetail>(
      `/api/concepts/${conceptId}`
    ),

  getProgress: (learnerId: string) =>
    request<import("@/types").Progress>(
      `/api/learners/${learnerId}/progress`
    ),

  startSession: (body: {
    name?: string;
    concept_id: string;
    demo_scenario?: string | null;
    learner_id?: string;
  }) =>
    request<import("@/types").SessionStart>(
      "/api/session/start",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  diagnose: (body: {
    session_id: string;
    learner_id: string;
    concept_id: string;
    answer: string;
    reasoning?: string;
    confidence: number;
  }) =>
    request<import("@/types").DiagnoseResponse>(
      "/api/diagnose",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  intervention: (body: {
    session_id: string;
    learner_id: string;
    concept_id: string;
    intervention_type?: string;
  }) =>
    request<import("@/types").Intervention>(
      "/api/intervention",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  reassess: (body: {
    session_id: string;
    learner_id: string;
    concept_id: string;
    answer: string;
    reasoning?: string;
    confidence: number;
  }) =>
    request<import("@/types").ReassessResponse>(
      "/api/reassess",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  getLearner: (learnerId: string) =>
    request<{
      learner_id: string;
      name: string;
      concept_states: import("@/types").LearnerConceptState[];
    }>(
      `/api/learners/${learnerId}`
    ),
};