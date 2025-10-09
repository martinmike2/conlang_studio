"use client"
import * as React from 'react'
import { Box, Paper, Stack, TextField, Button, Typography, Divider, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material'
import { applyOverlay, type Rule, type OverlayOp, type VariantOverlayRecord } from '@core/overlays'

type OverlayConflict = { opIndex: number; reason: string; op: OverlayOp }
type OverlayResult = { applied?: Rule[]; conflicts?: OverlayConflict[] } | { error: string } | null

type StoredOverlay = Pick<VariantOverlayRecord, 'id' | 'languageId' | 'name' | 'ops' | 'meta' | 'createdAt'>

export default function VariantOverlayDiff() {
  function isErrorResult(r: OverlayResult): r is { error: string } {
    return Boolean(r && typeof r === 'object' && 'error' in r)
  }

  function hasConflicts(r: OverlayResult): r is { conflicts: OverlayConflict[] } {
    return Boolean(r && typeof r === 'object' && 'conflicts' in r && Array.isArray(r.conflicts) && r.conflicts.length > 0)
  }
  const [baseText, setBaseText] = React.useState<string>(`[
  { "id": 1, "pattern": "t", "replacement": "d", "priority": 10 }
]`)
  const [opsText, setOpsText] = React.useState<string>(`[
  { "action": "update", "id": 1, "pattern": "t", "replacement": "t'", "priority": 5 }
]`)
  const [result, setResult] = React.useState<OverlayResult>(null)
  const [overlays, setOverlays] = React.useState<StoredOverlay[]>([])
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveName, setSaveName] = React.useState<string>('overlay-' + Date.now())
  const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>(() => ({ open: false, message: '', severity: 'success' }))

  function run() {
    let base: Rule[] = []
    let ops: OverlayOp[] = []
    try {
      base = JSON.parse(baseText)
    } catch (e: unknown) {
      setResult({ error: 'Invalid base JSON: ' + String(e) })
      return
    }
    try {
      ops = JSON.parse(opsText)
    } catch (e: unknown) {
      setResult({ error: 'Invalid ops JSON: ' + String(e) })
      return
    }

    try {
      const out = applyOverlay(base, ops)
      setResult(out)
    } catch (e: unknown) {
      setResult({ error: String(e) })
    }
  }

  async function saveOverlay() {
    setSaveOpen(true)
  }

  async function confirmSave() {
    setSaveOpen(false)
    try {
      const payload = { name: saveName || ('overlay-' + Date.now()), ops: JSON.parse(opsText) }
      const res = await fetch('/api/overlays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await res.json().catch(() => null)
      if (res.ok) {
        setSnack({ open: true, message: 'Saved overlay id=' + (body?.data?.id ?? 'unknown'), severity: 'success' })
      } else {
        setSnack({ open: true, message: 'Failed to save overlay: ' + JSON.stringify(body), severity: 'error' })
      }
    } catch (e: unknown) {
      setSnack({ open: true, message: 'Failed: ' + String(e), severity: 'error' })
    }
  }

  async function loadList() {
    try {
      const res = await fetch('/api/overlays')
      const body = await res.json().catch(() => null)
      if (res.ok) {
        const list = Array.isArray(body?.data) ? (body.data as StoredOverlay[]) : []
        setOverlays(list)
      } else {
        alert('Failed to load overlays: ' + JSON.stringify(body))
      }
    } catch (e: unknown) {
      alert('Failed: ' + String(e))
    }
  }

  function applyStoredOverlay(o: StoredOverlay) {
    try {
      setOpsText(JSON.stringify(o.ops, null, 2))
      // optionally run immediately
      run()
    } catch (e: unknown) {
      alert('Invalid overlay ops: ' + String(e))
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Variant Overlay Diff</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1">Base rules (JSON array of rules)</Typography>
          <TextField multiline minRows={6} value={baseText} onChange={(e) => setBaseText(e.target.value)} fullWidth />
          <Typography variant="subtitle1">Overlay ops (JSON array of ops)</Typography>
          <TextField multiline minRows={6} value={opsText} onChange={(e) => setOpsText(e.target.value)} fullWidth />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={run}>Apply overlay</Button>
            <Button variant="contained" onClick={saveOverlay}>Save overlay</Button>
            <Button variant="outlined" onClick={() => { setBaseText('[]'); setOpsText('[]'); setResult(null) }}>Clear</Button>
            <Button variant="outlined" onClick={loadList}>Load overlays</Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Result</Typography>
        <Divider sx={{ my: 1 }} />
        {isErrorResult(result) ? (
          <Typography color="error">{String(result.error)}</Typography>
        ) : null}

        {hasConflicts(result) ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Conflicts</Typography>
            <List dense>
              {result.conflicts.map((c, idx) => (
                  <ListItem key={idx} secondaryAction={<Button onClick={() => {
                    try {
                      const ops = JSON.parse(opsText)
                      ops.splice(c.opIndex, 1)
                      setOpsText(JSON.stringify(ops, null, 2))
                      run()
                    } catch (e) {
                      setSnack({ open: true, message: 'Failed to remove op: ' + String(e), severity: 'error' })
                    }
                  }} size="small">Skip</Button>}>
                    <ListItemText primary={`#${c.opIndex}: ${c.reason}`} secondary={JSON.stringify(c.op)} />
                  </ListItem>
              ))}
            </List>
          </Box>
        ) : null}

        {overlays.length ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Stored overlays</Typography>
            <List dense>
              {overlays.map((o) => (
                <ListItem key={o.id} secondaryAction={<Button onClick={() => applyStoredOverlay(o)}>Apply</Button>}>
                  <ListItemText primary={o.name} secondary={`id=${o.id} language=${o.languageId ?? 'any'}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : null}

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)}>
        <DialogTitle>Confirm save</DialogTitle>
        <DialogContent>
          <Typography>Save the current overlay to the server?</Typography>
          <TextField value={saveName} onChange={(e) => setSaveName(e.target.value)} label="Overlay name" fullWidth sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button onClick={confirmSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity ?? 'success'} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>

        <Typography variant="subtitle2">Applied rules</Typography>
        <List dense>
          {((result as { applied?: Rule[] } )?.applied ?? []).map((r) => (
            <ListItem key={r.id}><ListItemText primary={`id=${r.id} priority=${r.priority}`} secondary={`${r.pattern} -> ${r.replacement}`} /></ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  )
}
