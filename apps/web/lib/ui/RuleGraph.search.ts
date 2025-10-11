// Search and navigation logic for RuleGraph UI
import type { RuleNode } from './RuleGraph.types';

export function searchNodes(nodes: RuleNode[], query: string): RuleNode[] {
  const q = query.toLowerCase();
  return nodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
}
