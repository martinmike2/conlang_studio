// Types for RuleGraph viewer
export interface RuleNode {
  id: string;
  label: string;
  ruleType: string;
  ruleId: number;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface RuleEdge {
  source: string;
  target: string;
  relationType: string;
  explanation?: string;
  weight?: number;
}

export interface RuleGraphData {
  nodes: RuleNode[];
  edges: RuleEdge[];
  diagnostics?: {
    cycles?: string[][];
    shadowedRules?: string[];
    deadRules?: string[];
    unreachableRules?: string[];
  };
}
