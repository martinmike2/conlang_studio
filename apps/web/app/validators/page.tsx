"use client"
import React, { useEffect, useState } from "react"
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

type ValidatorResult = any

export default function ValidatorsPage() {
  const [results, setResults] = useState<ValidatorResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/validators')
      if (res.ok) {
        const json = await res.json()
        setResults(json.results)
      } else if (res.status === 404) {
        setResults([{ id: 'disabled', name: 'Validators panel disabled', status: 'fail', summary: 'Set FEATURE_VALIDATORS_PANEL=true in environment' }])
      } else {
        const text = await res.text()
        setResults([{ id: 'error', name: 'Failed to load', status: 'fail', summary: text }])
      }
    } catch (e: any) {
      setResults([{ id: 'error', name: 'Fetch error', status: 'fail', summary: e?.message ?? String(e) }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function toggle(id: string) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }))
  }

  return (
    <Box sx={{ p: 3, maxWidth: 920 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Validators</Typography>
        <Button variant="contained" color="primary" onClick={load} disabled={loading} startIcon={loading ? undefined : undefined}>
          {loading ? 'Running…' : 'Run validators'}
        </Button>
      </Box>

      {!results && !loading && <Typography>No validator results</Typography>}

      {results && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {results.map((r: any) => (
            <Card key={r.id} variant="outlined">
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                  <Typography variant="h6">{r.name ?? r.id}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.summary}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusChip status={r.status} />
                  <IconButton onClick={() => toggle(r.id)} aria-label="show details">
                    <ExpandMoreIcon sx={{ transform: expanded[r.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
                  </IconButton>
                </Box>
              </CardContent>

              <Collapse in={!!expanded[r.id]} timeout="auto" unmountOnExit>
                <CardContent>
                  {r.error ? (
                    <Box>
                      <Typography color="error" sx={{ fontWeight: 700 }}>Error</Typography>
                      <Typography sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{r.error.message}</Typography>
                      {r.error.stack && (
                        <details>
                          <summary>Stack</summary>
                          <pre style={{ maxHeight: 240, overflow: 'auto' }}>{r.error.stack}</pre>
                        </details>
                      )}
                    </Box>
                  ) : (
                    <Box>
                      <Typography sx={{ fontWeight: 700, mb: 1 }}>Raw result</Typography>
                      <pre style={{ maxHeight: 480, overflow: 'auto', fontFamily: 'monospace' }}>{JSON.stringify(r, null, 2)}</pre>
                    </Box>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}

function StatusChip({ status }: { status?: string }) {
  if (status === 'pass') return <Chip label="pass" color="success" size="small" />
  if (status === 'fail') return <Chip label="fail" color="error" size="small" />
  return <Chip label={status ?? 'unknown'} size="small" />
}
