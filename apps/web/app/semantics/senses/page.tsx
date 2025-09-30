"use client"

import * as React from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'

import { useFrames } from '../../../lib/hooks/useFrames'
import { useSenseNetwork } from '../../../lib/hooks/useSenseNetwork'
import SenseNetworkGraph from './SenseNetworkGraph'

export default function SensesPage() {
  const { data: framesData, isLoading: framesLoading } = useFrames()
  const frames = framesData ?? []

  const [selectedFrame, setSelectedFrame] = React.useState<number | null>(null)
  const [selectedRelations, setSelectedRelations] = React.useState<string[]>([])
  const [relationOptions, setRelationOptions] = React.useState<string[]>([])

  const { data: network, isLoading: networkLoading, isFetching: networkFetching } = useSenseNetwork({
    relationTypes: selectedRelations
  })

  React.useEffect(() => {
    if (!network?.edges) return
    setRelationOptions((prev) => {
      const next = new Set(prev)
      for (const edge of network.edges) {
        if (edge.relationType) {
          next.add(edge.relationType)
        }
      }
      const sorted = Array.from(next).sort()
      return sorted
    })
  }, [network?.edges])

  const allNodes = network?.nodes ?? []
  const allEdges = network?.edges ?? []

  const filteredNodes = React.useMemo(() => {
    if (selectedFrame === null) return allNodes
    return allNodes.filter((node) => node.frameId === selectedFrame)
  }, [allNodes, selectedFrame])

  const filteredEdges = React.useMemo(() => {
    if (selectedFrame === null) return allEdges
    const allowed = new Set(filteredNodes.map((node) => node.id))
    return allEdges.filter((edge) => allowed.has(edge.sourceSenseId) || allowed.has(edge.targetSenseId))
  }, [allEdges, filteredNodes, selectedFrame])

  const stats = React.useMemo(() => {
    if (selectedFrame === null) {
      if (network?.stats) return network.stats
      const primaryCount = allNodes.filter((node) => node.primary).length
      return { nodeCount: allNodes.length, edgeCount: allEdges.length, primaryCount }
    }
    const primaryCount = filteredNodes.filter((node) => node.primary).length
    return {
      nodeCount: filteredNodes.length,
      edgeCount: filteredEdges.length,
      primaryCount
    }
  }, [selectedFrame, network?.stats, allNodes, allEdges, filteredNodes, filteredEdges])

  const allNodeIndex = React.useMemo(() => {
    const map = new Map<number, (typeof allNodes)[number]>()
    for (const node of allNodes) {
      map.set(node.id, node)
    }
    return map
  }, [allNodes])

  const activeFrame = React.useMemo(() => {
    if (selectedFrame === null) return null
    return frames.find((frame) => frame.id === selectedFrame) ?? null
  }, [frames, selectedFrame])

  function toggleRelation(relationType: string) {
    setSelectedRelations((prev) => {
      const exists = prev.includes(relationType)
      if (exists) {
        return prev.filter((value) => value !== relationType)
      }
      return [...prev, relationType]
    })
  }

  function clearRelationFilters() {
    setSelectedRelations([])
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 120px)' }}>
      <Paper variant="outlined" sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle1">Frames</Typography>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {framesLoading ? (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List dense>
              <ListItemButton
                selected={selectedFrame === null}
                onClick={() => setSelectedFrame(null)}
              >
                <ListItemText primary="All senses" secondary="Across every frame" />
              </ListItemButton>
              {frames.map((frame) => (
                <ListItemButton
                  key={frame.id}
                  selected={frame.id === selectedFrame}
                  onClick={() => setSelectedFrame(frame.id)}
                >
                  <ListItemText
                    primary={frame.name}
                    secondary={frame.domain || undefined}
                  />
                </ListItemButton>
              ))}
              {frames.length === 0 && (
                <Typography sx={{ p: 2 }} color="text.secondary">
                  No frames yet.
                </Typography>
              )}
            </List>
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Sense network
            </Typography>
            {networkFetching && <CircularProgress size={18} />}
          </Box>

          {activeFrame && (
            <Typography variant="body2" color="text.secondary">
              Showing senses related to <strong>{activeFrame.name}</strong>
              {activeFrame.domain ? ` · Domain: ${activeFrame.domain}` : ''}
            </Typography>
          )}

          {relationOptions.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2">Relation types:</Typography>
              {relationOptions.map((relationType) => {
                const active = selectedRelations.includes(relationType)
                return (
                  <Chip
                    key={relationType}
                    label={relationType}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    onClick={() => toggleRelation(relationType)}
                  />
                )
              })}
              {selectedRelations.length > 0 && (
                <Button size="small" onClick={clearRelationFilters}>
                  Clear filters
                </Button>
              )}
            </Box>
          )}

          {(networkLoading || framesLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <React.Fragment>
              <SenseNetworkGraph
                nodes={allNodes}
                edges={allEdges}
                highlightFrameId={selectedFrame}
                loading={networkFetching}
              />

              <Stack direction="row" spacing={2}>
                <StatCard label="Nodes" value={stats.nodeCount} />
                <StatCard label="Primary" value={stats.primaryCount} />
                <StatCard label="Edges" value={stats.edgeCount} />
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Senses</Typography>
                {filteredNodes.length === 0 ? (
                  <Typography color="text.secondary">
                    No senses match the current filters.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Gloss</TableCell>
                          <TableCell>Frame</TableCell>
                          <TableCell>Primary</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredNodes.map((node) => (
                          <TableRow key={node.id}>
                            <TableCell>{node.gloss}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                {node.frameName && <Typography>{node.frameName}</Typography>}
                                {node.frameSlug && (
                                  <Chip label={node.frameSlug} size="small" variant="outlined" />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {node.primary ? (
                                <Chip label="Primary" color="primary" size="small" />
                              ) : (
                                <Chip label="Linked" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {node.definition || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Relations</Typography>
                {filteredEdges.length === 0 ? (
                  <Typography color="text.secondary">
                    No relations to display.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Relation</TableCell>
                          <TableCell>Source sense</TableCell>
                          <TableCell>Target sense</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredEdges.map((edge) => {
                          const source = allNodeIndex.get(edge.sourceSenseId)
                          const target = allNodeIndex.get(edge.targetSenseId)
                          return (
                            <TableRow key={edge.id}>
                              <TableCell>
                                <Chip label={edge.relationType} size="small" />
                              </TableCell>
                              <TableCell>
                                {source ? (
                                  <Tooltip title={source.definition || ''}>
                                    <span>{source.gloss}</span>
                                  </Tooltip>
                                ) : (
                                  <Typography color="text.secondary">Unknown ({edge.sourceSenseId})</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {target ? (
                                  <Tooltip title={target.definition || ''}>
                                    <span>{target.gloss}</span>
                                  </Tooltip>
                                ) : (
                                  <Typography color="text.secondary">Unknown ({edge.targetSenseId})</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </React.Fragment>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}

interface StatCardProps {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6">{value}</Typography>
    </Paper>
  )
}
