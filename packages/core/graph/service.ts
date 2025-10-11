import { getDb, type DbClient } from "@db/client";
import { loanRules, loanRulesets, stylePolicies, variantOverlays, ruleDependencies } from "@db/schema/core";
import { eq, and, or, inArray } from "drizzle-orm";
import type {
  RuleDependencyGraph,
  GraphNode,
  GraphEdge,
  ComputeGraphInput,
  RuleType,
  RelationType,
  RuleDependency,
} from "./types";

/**
 * Cache for computed graphs (simple in-memory cache with TTL)
 */
const graphCache = new Map<string, { graph: RuleDependencyGraph; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(input: ComputeGraphInput): string {
  return JSON.stringify({
    languageId: input.languageId,
    ruleTypes: input.ruleTypes?.sort() ?? [],
    includeComputed: input.includeComputed,
    includeDiagnostics: input.includeDiagnostics,
  });
}

/**
 * Fetch loan rules for a language
 */
async function fetchLoanRules(languageId: number, db: DbClient): Promise<GraphNode[]> {
  const rules = await db
    .select({
      id: loanRules.id,
      rulesetId: loanRules.rulesetId,
      priority: loanRules.priority,
      pattern: loanRules.pattern,
      replacement: loanRules.replacement,
      notes: loanRules.notes,
    })
    .from(loanRules)
    .innerJoin(loanRulesets, eq(loanRules.rulesetId, loanRulesets.id))
    .where(eq(loanRulesets.active, true));

  return rules.map((rule) => ({
    id: `loan_rule:${rule.id}`,
    ruleType: "loan_rule" as RuleType,
    ruleId: rule.id,
    label: `Loan Rule ${rule.id}`,
    summary: `${rule.pattern} → ${rule.replacement}`,
    metadata: {
      priority: rule.priority,
      pattern: rule.pattern,
      replacement: rule.replacement,
      notes: rule.notes,
    },
  }));
}

/**
 * Fetch style policy rules for a language
 */
async function fetchStylePolicyRules(languageId: number, db: DbClient): Promise<GraphNode[]> {
  const policies = await db
    .select()
    .from(stylePolicies)
    .where(eq(stylePolicies.languageId, languageId));

  const nodes: GraphNode[] = [];
  for (const policy of policies) {
    const rules = (policy.rules as Array<Record<string, unknown>>) ?? [];
    rules.forEach((rule, idx) => {
      const ruleId = policy.id * 1000 + idx; // Synthetic ID combining policy ID and rule index
      nodes.push({
        id: `style_policy_rule:${ruleId}`,
        ruleType: "style_policy_rule" as RuleType,
        ruleId,
        label: `${policy.name} Rule ${idx + 1}`,
        summary: JSON.stringify(rule).slice(0, 100),
        metadata: {
          policyId: policy.id,
          policyName: policy.name,
          ruleIndex: idx,
          rule,
        },
      });
    });
  }

  return nodes;
}

/**
 * Fetch variant overlay operations for a language
 */
async function fetchVariantOverlayOps(languageId: number, db: DbClient): Promise<GraphNode[]> {
  const overlays = await db
    .select()
    .from(variantOverlays)
    .where(eq(variantOverlays.languageId, languageId));

  const nodes: GraphNode[] = [];
  for (const overlay of overlays) {
    const ops = (overlay.ops as Array<Record<string, unknown>>) ?? [];
    ops.forEach((op, idx) => {
      const opId = overlay.id * 1000 + idx; // Synthetic ID combining overlay ID and op index
      nodes.push({
        id: `variant_overlay_op:${opId}`,
        ruleType: "variant_overlay_op" as RuleType,
        ruleId: opId,
        label: `${overlay.name} Op ${idx + 1}`,
        summary: JSON.stringify(op).slice(0, 100),
        metadata: {
          overlayId: overlay.id,
          overlayName: overlay.name,
          opIndex: idx,
          op,
        },
      });
    });
  }

  return nodes;
}

/**
 * Fetch all nodes for specified rule types
 */
async function fetchNodes(
  languageId: number,
  db: DbClient,
  ruleTypes?: RuleType[]
): Promise<GraphNode[]> {
  const typesToFetch = ruleTypes ?? ["loan_rule", "style_policy_rule", "variant_overlay_op"];
  const nodes: GraphNode[] = [];

  for (const ruleType of typesToFetch) {
    switch (ruleType) {
      case "loan_rule":
        nodes.push(...(await fetchLoanRules(languageId, db)));
        break;
      case "style_policy_rule":
        nodes.push(...(await fetchStylePolicyRules(languageId, db)));
        break;
      case "variant_overlay_op":
        nodes.push(...(await fetchVariantOverlayOps(languageId, db)));
        break;
      // TODO: Add other rule types (phon_rule, phonotactic_rule, syntax_rule)
      default:
        console.warn(`Rule type ${ruleType} not yet implemented`);
    }
  }

  return nodes;
}

/**
 * Fetch explicit dependencies from database
 */
async function fetchExplicitDependencies(
  languageId: number,
  db: DbClient,
  ruleTypes?: RuleType[]
): Promise<GraphEdge[]> {
  let query = db.select().from(ruleDependencies).where(eq(ruleDependencies.languageId, languageId));

  if (ruleTypes && ruleTypes.length > 0) {
    query = query.where(
      or(
        inArray(ruleDependencies.ruleType, ruleTypes),
        inArray(ruleDependencies.dependsOnType, ruleTypes)
      ) as any
    );
  }

  const deps = await query;

  return deps.map((dep) => ({
    source: `${dep.ruleType}:${dep.ruleId}`,
    target: `${dep.dependsOnType}:${dep.dependsOnId}`,
    relationType: dep.relationType as RelationType,
    explanation: dep.explanation ?? undefined,
    weight: dep.weight ?? 1,
  }));
}

/**
 * Compute implicit dependencies based on rule properties
 */
function computeImplicitDependencies(nodes: GraphNode[]): GraphEdge[] {
  const edges: GraphEdge[] = [];

  // Group nodes by type
  const loanRuleNodes = nodes.filter((n) => n.ruleType === "loan_rule");

  // Loan rules: create priority edges based on priority field
  const sortedLoanRules = [...loanRuleNodes].sort((a, b) => {
    const priorityA = (a.metadata?.priority as number) ?? 100;
    const priorityB = (b.metadata?.priority as number) ?? 100;
    return priorityA - priorityB;
  });

  for (let i = 0; i < sortedLoanRules.length - 1; i++) {
    edges.push({
      source: sortedLoanRules[i].id,
      target: sortedLoanRules[i + 1].id,
      relationType: "priority",
      explanation: `Priority ${sortedLoanRules[i].metadata?.priority} before ${sortedLoanRules[i + 1].metadata?.priority}`,
      weight: 1,
    });
  }

  // TODO: Add more implicit dependency computation:
  // - Style policy rules that might conflict
  // - Variant overlay ops that modify the same paths
  // - Phonological rules in the same stratum

  return edges;
}

/**
 * Detect cycles in the dependency graph using DFS
 */
function detectCycles(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const adjList = new Map<string, string[]>();

  // Build adjacency list
  for (const node of nodes) {
    adjList.set(node.id, []);
  }
  for (const edge of edges) {
    if (adjList.has(edge.source)) {
      adjList.get(edge.source)!.push(edge.target);
    }
  }

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjList.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
      }
    }

    recStack.delete(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return cycles;
}

/**
 * Detect shadowed rules (rules overridden by earlier rules)
 */
function detectShadowedRules(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  // TODO: Implement shadowing detection based on rule patterns
  // For loan rules, a rule with the same pattern but lower priority is shadowed
  return [];
}

/**
 * Detect dead rules (rules that never match)
 */
function detectDeadRules(nodes: GraphNode[]): string[] {
  // TODO: Implement dead rule detection
  // This requires analyzing rule patterns against actual data
  return [];
}

/**
 * Detect unreachable rules (rules that can't be reached due to dependencies)
 */
function detectUnreachableRules(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  // Build a set of reachable nodes starting from rules with no dependencies
  const reachable = new Set<string>();
  const adjList = new Map<string, string[]>();

  for (const node of nodes) {
    adjList.set(node.id, []);
  }
  for (const edge of edges) {
    if (adjList.has(edge.target)) {
      adjList.get(edge.target)!.push(edge.source);
    }
  }

  // Find nodes with no incoming edges (starting points)
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
      reachable.add(nodeId);
    }
  }

  // BFS to find all reachable nodes
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjList.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Unreachable nodes are those not in the reachable set
  return nodes.filter((n) => !reachable.has(n.id)).map((n) => n.id);
}

/**
 * Compute the rule dependency graph for a language
 */
export async function computeRuleDependencyGraph(
  input: ComputeGraphInput,
  db: DbClient = getDb()
): Promise<RuleDependencyGraph> {
  // Check cache
  const cacheKey = getCacheKey(input);
  const cached = graphCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.graph;
  }

  // Fetch nodes
  const nodes = await fetchNodes(input.languageId, db, input.ruleTypes);

  // Fetch explicit dependencies
  const explicitEdges = await fetchExplicitDependencies(input.languageId, db, input.ruleTypes);

  // Compute implicit dependencies if requested
  const implicitEdges = input.includeComputed ? computeImplicitDependencies(nodes) : [];

  // Combine edges
  const edges = [...explicitEdges, ...implicitEdges];

  // Build graph
  const graph: RuleDependencyGraph = {
    nodes,
    edges,
  };

  // Add diagnostics if requested
  if (input.includeDiagnostics) {
    const cycles = detectCycles(nodes, edges);
    const shadowedRules = detectShadowedRules(nodes, edges);
    const deadRules = detectDeadRules(nodes);
    const unreachableRules = detectUnreachableRules(nodes, edges);

    graph.diagnostics = {
      cycles,
      shadowedRules,
      deadRules,
      unreachableRules,
    };
  }

  // Cache the result
  graphCache.set(cacheKey, { graph, timestamp: Date.now() });

  return graph;
}

/**
 * Create an explicit dependency between rules
 */
export async function createRuleDependency(dep: Omit<RuleDependency, "id" | "createdAt">, db: DbClient = getDb()): Promise<RuleDependency> {
  const [result] = await db.insert(ruleDependencies).values(dep).returning();
  
  // Invalidate cache for this language
  for (const [key] of graphCache.entries()) {
    if (key.includes(`"languageId":${dep.languageId}`)) {
      graphCache.delete(key);
    }
  }
  
  return result as RuleDependency;
}

/**
 * Delete a rule dependency
 */
export async function deleteRuleDependency(id: number, languageId: number, db: DbClient = getDb()): Promise<void> {
  await db.delete(ruleDependencies).where(eq(ruleDependencies.id, id));
  
  // Invalidate cache for this language
  for (const [key] of graphCache.entries()) {
    if (key.includes(`"languageId":${languageId}`)) {
      graphCache.delete(key);
    }
  }
}

/**
 * Clear the graph cache (useful for testing or manual cache invalidation)
 */
export function clearGraphCache(): void {
  graphCache.clear();
}
