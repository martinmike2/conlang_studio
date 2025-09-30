"use client"

import * as React from 'react'
import { Box, CircularProgress, Paper, Typography, useTheme } from '@mui/material'
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum } from 'd3-force'
import type { SenseNetworkEdge, SenseNetworkNode } from '@core/semantics'

interface SenseNetworkGraphProps {
  nodes: SenseNetworkNode[]
  edges: SenseNetworkEdge[]
  highlightFrameId: number | null
  loading?: boolean
  height?: number
}

interface PositionedNode extends SenseNetworkNode {
  x: number
  y: number
}

interface PositionedLink {
  edge: SenseNetworkEdge
  source: PositionedNode
  target: PositionedNode
}

type LayoutNode = SenseNetworkNode & { x?: number; y?: number; vx?: number; vy?: number }
type LayoutLink = SimulationLinkDatum<LayoutNode> & { edge: SenseNetworkEdge }

function computeLayout(
  nodes: SenseNetworkNode[],
  edges: SenseNetworkEdge[],
  width: number,
  height: number
): { nodes: PositionedNode[]; links: PositionedLink[] } {
  if (width <= 0 || height <= 0 || nodes.length === 0) {
    return { nodes: [], links: [] }
  }

  const simulationNodes: LayoutNode[] = nodes.map((node) => ({ ...node }))
  const simulationLinks: LayoutLink[] = edges.map((edge) => ({
    source: edge.sourceSenseId,
    target: edge.targetSenseId,
    edge
  }))

  const simulation = forceSimulation<LayoutNode>(simulationNodes)
    .force('link', forceLink<LayoutNode, LayoutLink>(simulationLinks).id((d: LayoutNode) => d.id).distance(140).strength(0.7))
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide<LayoutNode>().radius(38))
    .force('center', forceCenter(0, 0))
    .stop()

  const iterations = Math.max(60, Math.min(300, nodes.length * 6))
  for (let i = 0; i < iterations; i += 1) {
    simulation.tick()
  }

  const xs = simulationNodes.map((node) => node.x ?? 0)
  const ys = simulationNodes.map((node) => node.y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = 0.9 * Math.min(width / spanX, height / spanY)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const positionedNodes: PositionedNode[] = simulationNodes.map((node) => ({
    ...node,
    x: ((node.x ?? 0) - centerX) * scale + width / 2,
    y: ((node.y ?? 0) - centerY) * scale + height / 2
  }))

  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]))

  const positionedLinks: PositionedLink[] = simulationLinks.map((link) => {
    const sourceNode = typeof link.source === 'object' ? link.source : nodeById.get(link.source as number)
    const targetNode = typeof link.target === 'object' ? link.target : nodeById.get(link.target as number)
    if (!sourceNode || !targetNode) {
      throw new Error('SenseNetworkGraph: link without corresponding node')
    }
    const source = nodeById.get((sourceNode as LayoutNode).id) as PositionedNode
    const target = nodeById.get((targetNode as LayoutNode).id) as PositionedNode
    return { edge: link.edge, source, target }
  })

  return { nodes: positionedNodes, links: positionedLinks }
}

export default function SenseNetworkGraph({
  nodes,
  edges,
  highlightFrameId,
  loading = false,
  height = 420
}: SenseNetworkGraphProps) {
  const theme = useTheme()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => {
      setWidth(element.clientWidth)
    }

    updateWidth()

    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  const layout = React.useMemo(() => computeLayout(nodes, edges, width, height), [nodes, edges, width, height])

  const highlightSet = React.useMemo(() => {
    if (highlightFrameId === null) return null
    const set = new Set<number>()
    for (const node of nodes) {
      if (node.frameId === highlightFrameId) {
        set.add(node.id)
      }
    }
    return set
  }, [nodes, highlightFrameId])

  const highlightActive = Boolean(highlightSet && highlightSet.size > 0)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Sense graph
      </Typography>
      <Box ref={containerRef} sx={{ position: 'relative', height }}>
        {layout.nodes.length === 0 ? (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Sense graph will appear once senses and relations are available.
            </Typography>
          </Box>
        ) : (
          <svg width={width} height={height} aria-label="Sense network graph">
            <g>
              {layout.links.map((link) => {
                const isActive = !highlightSet || highlightSet.has(link.edge.sourceSenseId) || highlightSet.has(link.edge.targetSenseId)
                const strokeOpacity = highlightActive ? (isActive ? 0.55 : 0.1) : 0.3
                const strokeWidth = isActive ? 1.8 : 1
                const strokeColor = isActive ? theme.palette.primary.light : theme.palette.divider
                return (
                  <line
                    key={link.edge.id}
                    x1={link.source.x}
                    y1={link.source.y}
                    x2={link.target.x}
                    y2={link.target.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                  />
                )
              })}
            </g>
            <g>
              {layout.nodes.map((node) => {
                const isHighlighted = !highlightSet || highlightSet.has(node.id)
                const baseFill = node.primary ? theme.palette.secondary.main : theme.palette.grey[500]
                const fill = highlightActive ? (isHighlighted ? theme.palette.primary.main : baseFill) : baseFill
                const opacity = highlightActive ? (isHighlighted ? 0.95 : 0.25) : 0.9
                const stroke = highlightActive && isHighlighted ? theme.palette.primary.dark : theme.palette.background.paper
                const radius = node.primary ? 11 : 9
                const label = node.gloss.length > 18 ? `${node.gloss.slice(0, 18)}…` : node.gloss

                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <circle r={radius} fill={fill} stroke={stroke} strokeWidth={1.5} fillOpacity={opacity} />
                    <text
                      x={0}
                      y={radius + 12}
                      textAnchor="middle"
                      fill={theme.palette.text.primary}
                      fillOpacity={opacity}
                      style={{ fontSize: 11, pointerEvents: 'none' }}
                    >
                      {label}
                    </text>
                    <title>
                      {node.gloss}
                      {node.frameName ? `\nFrame: ${node.frameName}` : ''}
                      {node.definition ? `\n${node.definition}` : ''}
                    </title>
                  </g>
                )
              })}
            </g>
          </svg>
        )}
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        All senses are shown. Selecting a frame highlights its nodes and relations while dimming the rest.
      </Typography>
    </Paper>
  )
}
