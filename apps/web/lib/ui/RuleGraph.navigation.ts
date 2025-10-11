// Navigation and node->editor linking for RuleGraph UI
import type { RuleNode } from './RuleGraph.types';

export function getEditorUrl(node: RuleNode): string {
  // Example: navigate to /languages/[id]/rules/edit/[ruleType]/[ruleId]
  // Extract languageId from window.location or context if needed
  // For now, fallback to /languages/rules/edit/[ruleType]/[ruleId]
  if (node.ruleType && node.ruleId !== undefined) {
    return `/languages/rules/edit/${node.ruleType}/${node.ruleId}`;
  }
  return `/languages/rules/edit/${node.id}`;
}
