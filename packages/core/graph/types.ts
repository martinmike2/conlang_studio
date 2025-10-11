import { z } from "zod";

/**
 * Rule types supported by the dependency graph
 */
export const ruleTypeSchema = z.enum([
  "loan_rule",
  "style_policy_rule",
  "variant_overlay_op",
  // Future rule types (tables not yet implemented):
  // "phon_rule" - phonological rules
  // "phonotactic_rule" - phonotactic rules  
  // "syntax_rule" - syntax rules
]);

export type RuleType = z.infer<typeof ruleTypeSchema>;

/**
 * Dependency relation types
 */
export const relationTypeSchema = z.enum([
  "priority", // Rule A must run before Rule B (order dependency)
  "conflicts", // Rules that could interfere with each other
  "triggers", // Rule A creates conditions for Rule B
  "same_stratum", // Rules that run in parallel (same processing layer)
]);

export type RelationType = z.infer<typeof relationTypeSchema>;

/**
 * Graph node representing a rule
 */
export const graphNodeSchema = z.object({
  id: z.string(), // Format: "ruleType:ruleId"
  ruleType: ruleTypeSchema,
  ruleId: z.number(),
  label: z.string(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;

/**
 * Graph edge representing a dependency
 */
export const graphEdgeSchema = z.object({
  source: z.string(), // Node id
  target: z.string(), // Node id
  relationType: relationTypeSchema,
  explanation: z.string().optional(),
  weight: z.number().default(1),
});

export type GraphEdge = z.infer<typeof graphEdgeSchema>;

/**
 * Complete rule dependency graph
 */
export const ruleDependencyGraphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  cycles: z.array(z.array(z.string())).optional(), // Array of cycles (each cycle is an array of node ids)
  diagnostics: z
    .object({
      cycles: z.array(z.array(z.string())),
      shadowedRules: z.array(z.string()), // Rules that are overridden by earlier rules
      deadRules: z.array(z.string()), // Rules that never match
      unreachableRules: z.array(z.string()), // Rules that can't be reached due to dependencies
    })
    .optional(),
});

export type RuleDependencyGraph = z.infer<typeof ruleDependencyGraphSchema>;

/**
 * Input for computing a dependency graph
 */
export const computeGraphInputSchema = z.object({
  languageId: z.number(),
  ruleTypes: z.array(ruleTypeSchema).optional(), // Filter to specific rule types
  includeComputed: z.boolean().default(true), // Include computed dependencies (not just explicit ones)
  includeDiagnostics: z.boolean().default(false), // Include cycle/shadowing/dead rule analysis
});

export type ComputeGraphInput = z.infer<typeof computeGraphInputSchema>;

/**
 * Dependency edge for database storage
 */
export const ruleDependencySchema = z.object({
  id: z.number().optional(),
  languageId: z.number(),
  ruleType: ruleTypeSchema,
  ruleId: z.number(),
  dependsOnType: ruleTypeSchema,
  dependsOnId: z.number(),
  relationType: relationTypeSchema,
  explanation: z.string().optional(),
  weight: z.number().default(1),
  createdAt: z.date().optional(),
});

export type RuleDependency = z.infer<typeof ruleDependencySchema>;
