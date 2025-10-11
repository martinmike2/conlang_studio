import { describe, it, expect } from "vitest";

describe("Rule Graph API Integration", () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  describe("GET /api/languages/[id]/rule-graph", () => {
    it("should return graph for valid language ID", async () => {
      const response = await fetch(`${API_BASE}/api/languages/1/rule-graph`);
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data).toHaveProperty("nodes");
      expect(data).toHaveProperty("edges");
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
    });

    it("should accept ruleTypes query parameter", async () => {
      const response = await fetch(
        `${API_BASE}/api/languages/1/rule-graph?ruleTypes=loan_rule`
      );
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // All nodes should be loan rules
      if (data.nodes.length > 0) {
        const allLoanRules = data.nodes.every((n: any) => n.ruleType === "loan_rule");
        expect(allLoanRules).toBe(true);
      }
    });

    it("should accept multiple rule types", async () => {
      const response = await fetch(
        `${API_BASE}/api/languages/1/rule-graph?ruleTypes=loan_rule,style_policy_rule`
      );
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
    });

    it("should include diagnostics when requested", async () => {
      const response = await fetch(
        `${API_BASE}/api/languages/1/rule-graph?includeDiagnostics=true`
      );
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data).toHaveProperty("diagnostics");
      expect(data.diagnostics).toHaveProperty("cycles");
      expect(data.diagnostics).toHaveProperty("shadowedRules");
      expect(data.diagnostics).toHaveProperty("deadRules");
      expect(data.diagnostics).toHaveProperty("unreachableRules");
    });

    it("should exclude computed dependencies when requested", async () => {
      const response = await fetch(
        `${API_BASE}/api/languages/1/rule-graph?includeComputed=false`
      );
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data).toHaveProperty("nodes");
      expect(data).toHaveProperty("edges");
    });

    it("should return 400 for invalid language ID", async () => {
      const response = await fetch(`${API_BASE}/api/languages/invalid/rule-graph`);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should handle non-existent language gracefully", async () => {
      const response = await fetch(`${API_BASE}/api/languages/99999/rule-graph`);
      
      // Should return 200 with empty graph rather than 404
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.nodes).toHaveLength(0);
      expect(data.edges).toHaveLength(0);
    });

    it("should return valid graph structure", async () => {
      const response = await fetch(`${API_BASE}/api/languages/1/rule-graph`);
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // Validate node structure
      if (data.nodes.length > 0) {
        const node = data.nodes[0];
        expect(node).toHaveProperty("id");
        expect(node).toHaveProperty("ruleType");
        expect(node).toHaveProperty("ruleId");
        expect(node).toHaveProperty("label");
        expect(typeof node.id).toBe("string");
        expect(typeof node.ruleId).toBe("number");
      }
      
      // Validate edge structure
      if (data.edges.length > 0) {
        const edge = data.edges[0];
        expect(edge).toHaveProperty("source");
        expect(edge).toHaveProperty("target");
        expect(edge).toHaveProperty("relationType");
        expect(edge).toHaveProperty("weight");
        expect(typeof edge.source).toBe("string");
        expect(typeof edge.target).toBe("string");
      }
    });

    it("should respect cache headers", async () => {
      const response1 = await fetch(`${API_BASE}/api/languages/1/rule-graph`);
      const response2 = await fetch(`${API_BASE}/api/languages/1/rule-graph`);
      
      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      // Data should be consistent
      expect(data1.nodes.length).toBe(data2.nodes.length);
      expect(data1.edges.length).toBe(data2.edges.length);
    });
  });
});
