// API client for RuleGraph viewer
import type { RuleGraphData } from './RuleGraph.types';

export async function fetchRuleGraph(languageId: string): Promise<RuleGraphData> {
  const res = await fetch(`/api/languages/${languageId}/rule-graph`);
  if (!res.ok) throw new Error('Failed to fetch rule graph');
  return await res.json();
}
