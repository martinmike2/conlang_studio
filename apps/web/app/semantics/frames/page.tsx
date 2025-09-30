"use client"
import * as React from 'react'
import { useFrames } from '../../../lib/hooks/useFrames'
import { useConfirm } from '../../../lib/providers/ConfirmationProvider'
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Paper, Typography, Divider, CircularProgress, List, ListItemButton, ListItemText
} from '@mui/material'

export default function FramesPage() {
  const { data, isLoading, create, update, remove } = useFrames()
  const confirm = useConfirm()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [form, setForm] = React.useState({ name: '', domain: '', description: '' })
  const [editForm, setEditForm] = React.useState({ name: '', domain: '', description: '' })

  const frames = data ?? []
  const active = frames.find(f => f.id === selected) ?? null

  function submit() {
    if (!form.name.trim()) return
    setError(null)
    create.mutate(
      { name: form.name.trim(), domain: form.domain.trim() || undefined, description: form.description.trim() || undefined, roles: [] },
      { onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Create failed') }
    )
    setForm({ name: '', domain: '', description: '' })
    setOpen(false)
  }

  function startEdit() {
    if (!active) return
    setEditForm({ name: active.name, domain: active.domain ?? '', description: active.description ?? '' })
    setEditing(true)
  }

  function saveEdit() {
    if (!active) return
    setError(null)
    update.mutate(
      { id: active.id, name: editForm.name.trim() || undefined, domain: editForm.domain.trim() || undefined, description: editForm.description.trim() || undefined },
      { onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Update failed'), onSuccess: () => setEditing(false) }
    )
  }

  async function deleteFrame() {
    if (!active) return
    const ok = await confirm({
      title: 'Delete Frame',
      description: `Are you sure you want to delete "${active.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true
    })
    if (!ok) return
    remove.mutate(active.id, { onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Delete failed'), onSuccess: () => setSelected(null) })
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 120px)' }}>
      <Paper variant="outlined" sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ flex: 1 }}>Frames</Typography>
          <Button size="small" variant="contained" onClick={() => setOpen(true)}>New</Button>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box> : (
            <List dense>
              {frames.map(f => (
                <ListItemButton key={f.id} selected={f.id === selected} onClick={() => setSelected(f.id)}>
                  <ListItemText primary={f.name} secondary={f.domain} />
                </ListItemButton>
              ))}
              {frames.length === 0 && <Typography sx={{ p: 2 }} color="text.secondary">No frames yet.</Typography>}
            </List>
          )}
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        {active ? (
          <Stack gap={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {editing ? (
                <TextField size="small" label="Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              ) : (
                <Typography variant="h6">{active.name}</Typography>
              )}
              <Box sx={{ flex: 1 }} />
              {!editing && <Button size="small" onClick={startEdit}>Edit</Button>}
              {!editing && <Button size="small" color="error" onClick={deleteFrame}>Delete</Button>}
              {editing && <Button size="small" variant="contained" disabled={update.isPending} onClick={saveEdit}>Save</Button>}
              {editing && <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>}
            </Box>
            {editing ? (
              <Stack direction="row" gap={2}>
                <TextField size="small" label="Domain" value={editForm.domain} onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))} />
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">Domain: {active.domain || '—'}</Typography>
            )}
            {editing ? (
              <TextField label="Description" multiline minRows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{active.description || 'No description.'}</Typography>
            )}
            <Divider />
            <Typography variant="subtitle2">Roles</Typography>
            {active.roles.length === 0 && <Typography color="text.secondary" variant="body2">No roles defined.</Typography>}
            {!editing && active.roles.map(r => (
              <Box key={r.name} sx={{ display: 'flex', gap: 1, fontSize: 14 }}>
                <strong>{r.name}</strong><span>({r.cardinality})</span>
              </Box>
            ))}
            {error && <Typography color="error" variant="body2">{error}</Typography>}
          </Stack>
        ) : (
          <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Select a frame to view details</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Frame</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} autoFocus onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Domain" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} />
            <TextField label="Description" value={form.description} multiline minRows={3} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending || !form.name.trim()} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
