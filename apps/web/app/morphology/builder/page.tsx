"use client"
import * as React from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

import { useMorphologyInventory } from '../../../lib/hooks/useMorphologyInventory'
import {
  generateBinding,
  type BindingPatternInput,
  type BindingRootInput,
  type GeneratedBinding
} from '@core/morphology/generator'

function toBindingRoot(root: { id: number; representation: string; gloss: string | null }): BindingRootInput {
  return {
    id: root.id,
    representation: root.representation,
    gloss: root.gloss ?? null
  }
}

function toBindingPattern(pattern: { id: number; name: string; skeleton: string; slotCount: number }): BindingPatternInput {
  return {
    id: pattern.id,
    skeleton: pattern.skeleton,
    slotCount: pattern.slotCount,
    name: pattern.name
  }
}

type FormatMode = 'plain' | 'hyphen'

function formatSkeletonTokens(skeleton: string): string[] {
  if (!skeleton) return []
  const tokens: string[] = []
  let i = 0
  while (i < skeleton.length) {
    const char = skeleton[i]
    if (char === ' ' || char === '\n') {
      i += 1
      continue
    }
    if (/[A-Z]/.test(char)) {
      let j = i + 1
      while (j < skeleton.length && /\d/.test(skeleton[j])) {
        j += 1
      }
      tokens.push(skeleton.slice(i, j))
      i = j
      continue
    }
    tokens.push(char)
    i += 1
  }
  return tokens
}

interface SegmentMeta {
  kind: 'slot' | 'literal'
  value: string
  placeholder?: string
  slotIndex?: number
}

function describeBinding(binding: GeneratedBinding | null, skeletonTokens: string[]): SegmentMeta[] {
  if (!binding) return []
  const result: SegmentMeta[] = []
  let slotCursor = 0
  for (let i = 0; i < binding.segments.length; i += 1) {
    const segment = binding.segments[i]
    const token = skeletonTokens[i] ?? ''
    if (/[A-Z]/.test(token)) {
      const definition = binding.definitions[slotCursor]
      result.push({
        kind: 'slot',
        value: segment,
        placeholder: definition?.placeholder ?? token,
        slotIndex: definition?.slotIndex ?? slotCursor
      })
      slotCursor += 1
    } else {
      result.push({ kind: 'literal', value: segment })
    }
  }
  return result
}

function RootPatternBuilderPage() {
  const { data, isLoading, error, refetch, isFetching } = useMorphologyInventory()
  const roots = data?.roots ?? []
  const patterns = data?.patterns ?? []

  const [rootId, setRootId] = React.useState<string>('')
  const [patternId, setPatternId] = React.useState<string>('')
  const [formatMode, setFormatMode] = React.useState<FormatMode>('plain')
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle')

  React.useEffect(() => {
    if (rootId !== '' || roots.length === 0) return
    setRootId(roots[0] ? String(roots[0].id) : '')
  }, [roots, rootId])

  React.useEffect(() => {
    if (patternId !== '' || patterns.length === 0) return
    setPatternId(patterns[0] ? String(patterns[0].id) : '')
  }, [patterns, patternId])

  const selectedRoot = React.useMemo(() => {
    if (rootId === '') return null
    const id = Number(rootId)
    if (Number.isNaN(id)) return null
    return roots.find(root => root.id === id) ?? null
  }, [rootId, roots])

  const selectedPattern = React.useMemo(() => {
    if (patternId === '') return null
    const id = Number(patternId)
    if (Number.isNaN(id)) return null
    return patterns.find(pattern => pattern.id === id) ?? null
  }, [patternId, patterns])

  const binding = React.useMemo(() => {
    if (!selectedRoot || !selectedPattern) return null
    const rootRecord = toBindingRoot(selectedRoot)
    const patternRecord = toBindingPattern(selectedPattern)
    const formatter = formatMode === 'hyphen' ? (segments: string[]) => segments.join('-') : undefined
    return generateBinding(rootRecord, patternRecord, formatter ? { stemFormatter: formatter } : undefined)
  }, [selectedRoot, selectedPattern, formatMode])

  const skeletonTokens = React.useMemo(() => formatSkeletonTokens(selectedPattern?.skeleton ?? ''), [selectedPattern])
  const segments = React.useMemo(() => describeBinding(binding, skeletonTokens), [binding, skeletonTokens])

  async function copySurfaceForm() {
    if (!binding) return
    try {
      await navigator.clipboard.writeText(binding.surfaceForm)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch (err) {
      console.error(err)
      setCopyState('failed')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  function handleFormatChange(_event: React.MouseEvent<HTMLElement>, next: FormatMode | null) {
    if (!next) return
    setFormatMode(next)
  }

  function handleRootChange(event: SelectChangeEvent<string>) {
    setRootId(event.target.value)
  }

  function handlePatternChange(event: SelectChangeEvent<string>) {
    setPatternId(event.target.value)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="h5">Root Pattern Builder</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" icon={<ErrorOutlineIcon fontSize="small" />}>{(error as Error).message || 'Failed to load inventory'}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems="stretch">
        <Paper variant="outlined" sx={{ flex: 1, p: 3, minWidth: 280 }}>
          <Stack gap={2}>
            <Typography variant="subtitle1">1. Choose a root</Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : roots.length === 0 ? (
              <Alert severity="info">No roots available. Create roots via the data management panel.</Alert>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel id="root-select-label">Root</InputLabel>
                <Select
                  labelId="root-select-label"
                  value={rootId}
                  label="Root"
                  onChange={handleRootChange}
                >
                  {roots.map(root => (
                    <MenuItem key={root.id} value={String(root.id)}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography component="span" fontWeight={600}>{root.representation}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {root.gloss || '—'}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedRoot && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Segments</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {selectedRoot.representation.replace(/[^A-Za-z]/g, '').split('').map((segment, index) => (
                    <Chip key={`${segment}-${index}`} label={segment} size="small" />
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Gloss: {selectedRoot.gloss || '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Root ID: {selectedRoot.id}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ flex: 1, p: 3, minWidth: 280 }}>
          <Stack gap={2}>
            <Typography variant="subtitle1">2. Select a pattern</Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : patterns.length === 0 ? (
              <Alert severity="info">No patterns available. Create patterns via the data management panel.</Alert>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel id="pattern-select-label">Pattern</InputLabel>
                <Select
                  labelId="pattern-select-label"
                  value={patternId}
                  label="Pattern"
                  onChange={handlePatternChange}
                >
                  {patterns.map(pattern => (
                    <MenuItem key={pattern.id} value={String(pattern.id)}>
                      <Stack direction="row" gap={1} alignItems="center">
                        <Typography component="span" fontWeight={600}>{pattern.name}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {pattern.skeleton}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedPattern && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Skeleton</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {skeletonTokens.map((token, index) => (
                    <Chip key={`${token}-${index}`} label={token} size="small" variant={/[A-Z]/.test(token) ? 'filled' : 'outlined'} color={/[A-Z]/.test(token) ? 'primary' : 'default'} />
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary">Slot count: {selectedPattern.slotCount}</Typography>
                <Typography variant="caption" color="text.secondary">Pattern ID: {selectedPattern.id}</Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ flex: 1.4, p: 3, minWidth: 320 }}>
          <Stack gap={2} sx={{ height: '100%' }}>
            <Typography variant="subtitle1">3. Preview binding</Typography>
            {!selectedRoot || !selectedPattern ? (
              <Alert severity="info">Select a root and pattern to preview a generated stem.</Alert>
            ) : (
              <>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="h4" component="span">{binding?.surfaceForm || '—'}</Typography>
                  <Tooltip title={copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy surface form'}>
                    <span>
                      <Button size="small" variant="outlined" startIcon={<ContentCopyIcon fontSize="small" />} onClick={copySurfaceForm} disabled={!binding}>
                        Copy
                      </Button>
                    </span>
                  </Tooltip>
                  {copyState === 'copied' && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                  {copyState === 'failed' && <ErrorOutlineIcon color="error" fontSize="small" />}
                </Stack>

                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="caption" color="text.secondary">Formatter</Typography>
                  <ToggleButtonGroup value={formatMode} exclusive onChange={handleFormatChange} size="small">
                    <ToggleButton value="plain">Plain</ToggleButton>
                    <ToggleButton value="hyphen">Hyphenated</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Divider />

                <Typography variant="subtitle2">Segments</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {binding?.segments.map((segment, index) => (
                    <Chip
                      key={`${segment}-${index}`}
                      label={segment}
                      size="small"
                      color={segments[index]?.kind === 'slot' ? 'primary' : 'default'}
                    />
                  ))}
                </Stack>

                <Typography variant="subtitle2">Slot mapping</Typography>
                <Table size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width="20%">Order</TableCell>
                      <TableCell width="40%">Placeholder</TableCell>
                      <TableCell width="40%">Output</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {segments.filter(segment => segment.kind === 'slot').map(segment => (
                      <TableRow key={`${segment.placeholder}-${segment.slotIndex}`}>
                        <TableCell>{(segment.slotIndex ?? 0) + 1}</TableCell>
                        <TableCell>{segment.placeholder}</TableCell>
                        <TableCell>{segment.value}</TableCell>
                      </TableRow>
                    ))}
                    {segments.filter(segment => segment.kind === 'slot').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary">Pattern has no consonant placeholders.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <Typography variant="caption" color="text.secondary">Definitions align with generator output. Save bindings via forthcoming persistence tooling.</Typography>
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}

export default RootPatternBuilderPage
