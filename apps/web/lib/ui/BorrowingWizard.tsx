"use client"
import * as React from 'react'
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material'

export function BorrowingWizard() {
  const [donorLanguage, setDonorLanguage] = React.useState('')
  const [recipientLanguage, setRecipientLanguage] = React.useState('')
  const [sourceText, setSourceText] = React.useState('')
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null)
  type Flag = { id?: number | string; reason?: string; [k: string]: unknown }
  type Candidate = { score?: number; rootId?: number; patternId?: number; [k: string]: unknown }
  const [flags, setFlags] = React.useState<Flag[]>([])
  const [loading, setLoading] = React.useState(false)

  const [candidates, setCandidates] = React.useState<Candidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = React.useState(false)
  const [previewDebug, setPreviewDebug] = React.useState<unknown>(null)

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/borrowing/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donorLanguage, recipientLanguage, sourceText })
      })
  const intakeBody = await res.json().catch(() => null)
  const createdEvent = (intakeBody && typeof intakeBody === 'object' ? ((intakeBody as Record<string, unknown>).data as Record<string, unknown> | undefined) ?? intakeBody : intakeBody) as Record<string, unknown> | null
  setResult(createdEvent)

      if (createdEvent && createdEvent.id) {
        setCandidatesLoading(true)
        setPreviewDebug(null)
        try {
          const preview = await fetch('/api/morphology/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ surface: sourceText })
          })
          const body = await preview.json().catch(() => null)
          setPreviewDebug(body)
          if (preview.ok && body && typeof body === 'object' && Array.isArray(((body as Record<string, unknown>).data))) {
            setCandidates(((body as Record<string, unknown>).data) as Candidate[])
          } else {
            setCandidates([])
          }
        } catch (error) {
      setPreviewDebug({ error: String(error) })
          setCandidates([])
        } finally {
          setCandidatesLoading(false)
        }
      }
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const loadFlags = React.useCallback(async () => {
    try {
      const res = await fetch('/api/borrowing/flags', { method: 'GET' })
      if (res.ok) {
        const body = await res.json().catch(() => null)
        if (body && typeof body === 'object' && Array.isArray(((body as Record<string, unknown>).data))) {
          setFlags(((body as Record<string, unknown>).data) as Flag[])
        } else {
          setFlags([])
        }
      } else {
        setFlags([])
      }
      } catch {
        setFlags([])
      }
    }, [])

  const createAndAcceptFlag = async (candidate: Candidate) => {
    if (!result || !result.id) return
    try {
      const createRes = await fetch('/api/borrowing/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactEventId: result.id, candidateRootId: candidate.rootId, candidatePatternId: candidate.patternId, reason: 'wizard' })
      })
      const createdBody = await createRes.json().catch(() => null)
      const created = createdBody?.data ?? createdBody
      if (created && created.id) {
        await fetch('/api/borrowing/flags', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flagId: created.id })
        })
        await loadFlags()
      }
    } catch {
      // ignore for now
    }
  }

  React.useEffect(() => {
    void loadFlags()
  }, [loadFlags])

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Borrowing Wizard</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Donor language" value={donorLanguage} onChange={(e) => setDonorLanguage((e.target as HTMLInputElement).value)} fullWidth />
            <TextField label="Recipient language" value={recipientLanguage} onChange={(e) => setRecipientLanguage((e.target as HTMLInputElement).value)} fullWidth />
            <TextField label="Source text" value={sourceText} onChange={(e) => setSourceText((e.target as HTMLInputElement).value)} fullWidth />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" type="submit" disabled={loading}>{loading ? <CircularProgress size={18} /> : 'Create contact event'}</Button>
              <Button variant="outlined" onClick={() => { setDonorLanguage(''); setRecipientLanguage(''); setSourceText('') }}>Clear</Button>
            </Stack>
          </Stack>
        </form>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Result</Typography>
        <Divider sx={{ my: 1 }} />
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(result, null, 2)}</pre>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Loan flags</Typography>
          <Button size="small" onClick={loadFlags}>Refresh</Button>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <List dense>
          {flags.map((f, idx) => (
            <ListItem key={String(f.id ?? idx)}>
              <ListItemText primary={f.reason ?? `Flag ${f.id}`} secondary={JSON.stringify(f)} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Classifier candidates</Typography>
        <Divider sx={{ my: 1 }} />
        {candidatesLoading ? <Box sx={{ py: 2 }}><CircularProgress /></Box> : (
          <List>
            {Array.isArray(candidates) && candidates.map((c, idx) => (
              <ListItem key={idx} secondaryAction={<Button size="small" onClick={() => createAndAcceptFlag(c)}>Create & Accept</Button>}>
                <ListItemText
                  primary={`score: ${typeof c.score === 'number' ? c.score.toFixed(2) : String(c.score)}`}
                  secondary={c.rootId ? `root ${c.rootId}` : c.patternId ? `pattern ${c.patternId}` : ''}
                />
              </ListItem>
            ))}
          </List>
        )}

        {Array.isArray(candidates) && candidates.length === 0 ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">No candidates returned.</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{JSON.stringify(previewDebug, null, 2)}</pre>
          </Box>
        ) : null}
      </Paper>
    </Box>
  )
}

export default BorrowingWizard
