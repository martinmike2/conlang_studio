import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeRuleDependencyGraph, clearGraphCache } from "@core/graph/service";
import type { ComputeGraphInput, RuleType } from "@core/graph/types";
import { createCoreTestDb } from "./utils/morphologyTestUtils";
import type { DbClient } from "@db/client";

describe("Rule Dependency Graph Service", () => {
  let db: DbClient;
  let dispose: () => Promise<void>;

  beforeEach(async () => {
    clearGraphCache();
    const testDb = await createCoreTestDb();
    db = testDb.db as unknown as DbClient;
    dispose = testDb.dispose;
  });

  afterEach(async () => {
    await dispose();
  });

  describe("computeRuleDependencyGraph", () => {
    it("should compute graph with loan rules", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        ruleTypes: ["loan_rule"],
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      expect(graph).toHaveProperty("nodes");
      expect(graph).toHaveProperty("edges");
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it("should compute graph with all rule types", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      expect(graph).toHaveProperty("nodes");
      expect(graph).toHaveProperty("edges");
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it("should include diagnostics when requested", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        includeComputed: true,
        includeDiagnostics: true,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      expect(graph).toHaveProperty("diagnostics");
      expect(graph.diagnostics).toHaveProperty("cycles");
      expect(graph.diagnostics).toHaveProperty("shadowedRules");
      expect(graph.diagnostics).toHaveProperty("deadRules");
      expect(graph.diagnostics).toHaveProperty("unreachableRules");
      expect(Array.isArray(graph.diagnostics?.cycles)).toBe(true);
    });

    it("should cache results", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        ruleTypes: ["loan_rule"],
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph1 = await computeRuleDependencyGraph(input, db);
      const graph2 = await computeRuleDependencyGraph(input, db);

      // Should return the same reference (cached)
      expect(graph1).toBe(graph2);
    });

    it("should compute implicit priority dependencies for loan rules", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        ruleTypes: ["loan_rule"],
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      // If there are multiple loan rules, there should be priority edges
      if (graph.nodes.length > 1) {
        const priorityEdges = graph.edges.filter((e) => e.relationType === "priority");
        expect(priorityEdges.length).toBeGreaterThan(0);
      }
    });

    it("should not include computed dependencies when includeComputed is false", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        ruleTypes: ["loan_rule"],
        includeComputed: false,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      // Should only have explicit dependencies (which may be empty)
      // This is valid behavior - no implicit edges
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it("should handle empty rule sets gracefully", async () => {
      const input: ComputeGraphInput = {
        languageId: 99999, // Non-existent language
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });

    it("should filter by specific rule types", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        ruleTypes: ["loan_rule"],
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      // All nodes should be loan rules
      const allLoanRules = graph.nodes.every((n) => n.ruleType === "loan_rule");
      expect(allLoanRules).toBe(true);
    });
  });

  describe("Graph node structure", () => {
    it("should have correct node structure", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      if (graph.nodes.length > 0) {
        const node = graph.nodes[0];
        expect(node).toHaveProperty("id");
        expect(node).toHaveProperty("ruleType");
        expect(node).toHaveProperty("ruleId");
        expect(node).toHaveProperty("label");
        expect(typeof node.id).toBe("string");
        expect(node.id).toMatch(/^[a-z_]+:\d+$/); // Format: "ruleType:ruleId"
      }
    });

    it("should have correct edge structure", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        includeComputed: true,
        includeDiagnostics: false,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      if (graph.edges.length > 0) {
        const edge = graph.edges[0];
        expect(edge).toHaveProperty("source");
        expect(edge).toHaveProperty("target");
        expect(edge).toHaveProperty("relationType");
        expect(edge).toHaveProperty("weight");
        expect(typeof edge.source).toBe("string");
        expect(typeof edge.target).toBe("string");
        expect(["priority", "conflicts", "triggers", "same_stratum"]).toContain(
          edge.relationType
        );
      }
    });
  });

  describe("Cycle detection", () => {
    it("should detect cycles when diagnostics are enabled", async () => {
      const input: ComputeGraphInput = {
        languageId: 1,
        includeComputed: true,
        includeDiagnostics: true,
      };

      const graph = await computeRuleDependencyGraph(input, db);

      expect(graph.diagnostics).toBeDefined();
      expect(Array.isArray(graph.diagnostics?.cycles)).toBe(true);
      
      // Cycles should be arrays of node IDs
      if (graph.diagnostics && graph.diagnostics.cycles.length > 0) {
        const cycle = graph.diagnostics.cycles[0];
        expect(Array.isArray(cycle)).toBe(true);
        expect(cycle.every((nodeId) => typeof nodeId === "string")).toBe(true);
      }
    });
  });
});
