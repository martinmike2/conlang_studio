"use client"
import * as React from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'

type MetricsMap = Record<string, number>

interface MetricsJob {
  id: number
  status: string
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

interface MetricsSnapshot {
  id: number
  languageId: number
  metrics: MetricsMap
  createdAt: string
  versionRef: string | null
}

interface MetricsResponse {
  languageId: number
  metrics: MetricsMap
  snapshot: MetricsSnapshot | null
  history: MetricsSnapshot[]
  jobs: MetricsJob[]
}

const METRIC_LABELS: Record<string, string> = {
  articulatoryLoad: 'Articulatory Load',
  homophonyDensity: 'Homophony Density',
  clusterComplexity: 'Cluster Complexity',
  ambiguity: 'Lexical Ambiguity',
  morphologicalOpacity: 'Morphological Opacity',
  processingLoad: 'Processing Load',
  borrowingInvalidPatternCount: 'Borrowing Invalid Patterns',
  borrowingRegexWorkerTimeouts: 'Borrowing Regex Timeouts',
  borrowingRegexWorkerErrors: 'Borrowing Regex Errors',
  borrowingSkippedPatterns: 'Borrowing Patterns Skipped'
}

function formatValue(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '—'
  }
  return value.toFixed(2)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function MetricsDashboard() {
  const [summary, setSummary] = React.useState<MetricsResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)
  const [lastRun, setLastRun] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/metrics', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error?.message ?? 'Failed to load metrics')
      }
      setSummary(body.data as MetricsResponse)
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load().catch(() => null)
  }, [load])

  async function triggerRun(force = false) {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error?.message ?? 'Failed to trigger metrics job')
      }
      setLastRun(new Date().toISOString())
      await load()
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to trigger metrics job')
    } finally {
      setRunning(false)
    }
  }

  const metrics = summary?.metrics ?? {}
  const history = summary?.history ?? []
  const jobs = summary?.jobs ?? []
  const latestJob = jobs[0]

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="h4" gutterBottom>Metrics Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Track key phonological and lexical metrics over time. Snapshots are recorded every time the metrics job runs.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h6">Current metrics</Typography>
              <Typography variant="caption" color="text.secondary">
                Last snapshot: {summary?.snapshot ? formatDate(summary.snapshot.createdAt) : 'not recorded yet'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => triggerRun(false)} disabled={running}>
                {running ? 'Running…' : 'Run metrics job'}
              </Button>
              <Button variant="text" onClick={() => triggerRun(true)} disabled={running}>
                Force re-run
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {Object.entries(METRIC_LABELS).map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
                      <Typography variant="h4">{formatValue(metrics[key])}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Typography variant="caption" color="text.secondary">
            Last run: {lastRun ? formatDate(lastRun) : latestJob ? formatDate(latestJob.finishedAt ?? latestJob.startedAt) : '—'}
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Recent snapshots</Typography>
        {history.length === 0 ? (
          <Alert severity="info">No metrics snapshots recorded yet. Run the metrics job to create the first snapshot.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                {Object.keys(METRIC_LABELS).map((metric) => (
                  <TableCell key={metric}>{METRIC_LABELS[metric]}</TableCell>
                ))}
                <TableCell>Version</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((snap) => (
                <TableRow key={snap.id}>
                  <TableCell>{formatDate(snap.createdAt)}</TableCell>
                  {Object.keys(METRIC_LABELS).map((metric) => (
                    <TableCell key={metric}>{formatValue((snap.metrics as MetricsMap)[metric])}</TableCell>
                  ))}
                  <TableCell>{snap.versionRef ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Job history</Typography>
        {jobs.length === 0 ? (
          <Alert severity="info">No metrics jobs have been scheduled yet.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Created</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Finished</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{formatDate(job.createdAt)}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{formatDate(job.startedAt)}</TableCell>
                  <TableCell>{formatDate(job.finishedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  )
}
