"use client";
import React from 'react';
import { useEffect, useState } from 'react';
import { fetchRuleGraph } from './RuleGraph.api';
import type { RuleGraphData } from './RuleGraph.types';
// TODO: import ReactFlow when ready

/**
 * RuleGraph viewer component for PR-005
 * Displays rule dependency graph using react-flow
 * Includes search, navigation, and node->editor linking
 */

const RuleGraph: React.FC<{ languageId?: string }> = ({ languageId }) => {
  const [graph, setGraph] = useState<RuleGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!languageId || isNaN(Number(languageId))) {
      setError('No valid language selected. Please select a language.');
      setGraph(null);
      return;
    }
    setError(null);
    fetchRuleGraph(languageId)
      .then(setGraph)
      .catch(e => setError(e.message));
  }, [languageId]);

  const [search, setSearch] = useState('');
  const filteredNodes = graph?.nodes && search
    ? require('./RuleGraph.search').searchNodes(graph.nodes, search)
    : graph?.nodes;

  return (
    <div>
      <h2>Rule Graph</h2>
      <h3>Rule Dependency Graph</h3>
      <input
        type="text"
        placeholder="Search nodes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
        disabled={!languageId || isNaN(Number(languageId))}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!graph && !error ? (
        <p>Loading graph...</p>
      ) : (
        <>
          <pre id="rule-graph-json">{JSON.stringify({ ...graph, nodes: filteredNodes }, null, 2)}</pre>
          <ul>
            {(filteredNodes || []).map((node: import('./RuleGraph.types').RuleNode) => (
              <li key={node.id}>
                <button
                  style={{ textDecoration: 'underline', color: 'blue', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => window.location.href = require('./RuleGraph.navigation').getEditorUrl(node)}
                >
                  {node.label} ({node.id})
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default RuleGraph;
