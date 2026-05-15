export interface AgentResult {
  score: number;
  grade: string;
  issues: string[];
  suggestion: string;
}

export async function analyzeCode(code: string): Promise<AgentResult> {
  const res = await fetch('/agent/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as AgentResult;
}
