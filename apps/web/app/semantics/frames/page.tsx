"use client"
import * as React from 'react'
import { useFrames, type FrameRole } from '../../../lib/hooks/useFrames'
import { useActivityLog } from '../../../lib/hooks/useActivityLog'
import { useConfirm } from '../../../lib/providers/ConfirmationProvider'
import { normalizeFrameRoles } from '@core/semantics/roles'
import { slugify } from '../../../lib/utils/slug'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

const CARDINALITY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '1', label: 'Single (exactly one)' },
  { value: '0..1', label: 'Optional (0..1)' },
  { value: '0..n', label: 'Multi (0..n)' }
]

const DEFAULT_CARDINALITY = '1'

function formatActivityMeta(entry: { occurredAt: string; scope: string; entity: string | null; action: string }) {
  const timestamp = new Date(entry.occurredAt).toLocaleString()
  const parts = [timestamp, entry.scope]
  if (entry.entity) parts.push(entry.entity)
  parts.push(entry.action)
  return parts.join(' · ')
}

export default function FramesPage() {
  const { data, isLoading, create, update, remove } = useFrames()
  const {
    entries: activityEntries,
    connected: activityConnected,
    fetchNextPage: fetchMoreActivity,
    hasNextPage: hasMoreActivity,
    isFetchingNextPage: loadingMoreActivity,
    isLoading: activityLoading
  } = useActivityLog({ pageSize: 25 })
  const confirm = useConfirm()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<number | null>(null)

  const [form, setForm] = React.useState<{ name: string; domain: string; description: string; roles: FrameRole[] }>({ name: '', domain: '', description: '', roles: [] })
  const [formNameTouched, setFormNameTouched] = React.useState(false)
  const [createRoleDraft, setCreateRoleDraft] = React.useState({ name: '', cardinality: DEFAULT_CARDINALITY })

  const [editForm, setEditForm] = React.useState<{ name: string; domain: string; description: string; roles: FrameRole[] }>({ name: '', domain: '', description: '', roles: [] })
  const [editNameTouched, setEditNameTouched] = React.useState(false)
  const [editRoleDraft, setEditRoleDraft] = React.useState({ name: '', cardinality: DEFAULT_CARDINALITY })
  const [sensePending, setSensePending] = React.useState(false)

  const frames = data ?? []
  const active = frames.find(f => f.id === selected) ?? null

  const formNameTrimmed = form.name.trim()
  const formSlug = slugify(formNameTrimmed)
  const createSlugClash = formSlug ? frames.some(f => f.slug === formSlug) : false
  const formNameError = !formNameTrimmed ? 'Name is required' : createSlugClash ? 'Another frame already uses this slug' : undefined

  const editNameTrimmed = editForm.name.trim()
  const editSlug = slugify(editNameTrimmed)
  const editSlugClash = active ? frames.some(f => f.slug === editSlug && f.id !== active.id) : false
  const editNameError = !editNameTrimmed ? 'Name is required' : editSlugClash ? 'Another frame already uses this slug' : undefined

  const normalizedEditRoles = normalizeFrameRoles(editForm.roles)
  const normalizedActiveRoles = normalizeFrameRoles(active?.roles ?? [])
  const hasEdits = active
    ? editNameTrimmed !== active.name ||
      (editForm.domain.trim() || '') !== (active.domain ?? '') ||
      (editForm.description.trim() || '') !== (active.description ?? '') ||
      JSON.stringify(normalizedEditRoles) !== JSON.stringify(normalizedActiveRoles)
    : false

  const createDisabled = create.isPending || Boolean(formNameError)
  const saveDisabled = update.isPending || Boolean(editNameError) || !hasEdits

  function resetCreateDialog() {
    setForm({ name: '', domain: '', description: '', roles: [] })
    setCreateRoleDraft({ name: '', cardinality: DEFAULT_CARDINALITY })
    setFormNameTouched(false)
  }

  function openCreateDialog() {
    resetCreateDialog()
    setError(null)
    setInfo(null)
    setOpen(true)
  }

  function submit() {
    if (formNameError) {
      setFormNameTouched(true)
      return
    }
    setError(null)
    setInfo(null)
    create.mutate(
      {
        name: formNameTrimmed,
        domain: form.domain.trim() || undefined,
        description: form.description.trim() || undefined,
        roles: form.roles.map((role, index) => ({ ...role, order: index }))
      },
      {
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Create failed'),
        onSuccess: () => {
          setInfo(`Created “${formNameTrimmed}”`)
        },
        onSettled: () => {
          resetCreateDialog()
          setOpen(false)
        }
      }
    )
  }

  function startEdit() {
    if (!active) return
    setError(null)
    setInfo(null)
    setEditForm({
      name: active.name,
      domain: active.domain ?? '',
      description: active.description ?? '',
      roles: normalizeFrameRoles(active.roles ?? []).map((role, index) => ({ ...role, order: index }))
    })
    setEditRoleDraft({ name: '', cardinality: DEFAULT_CARDINALITY })
    setEditNameTouched(false)
    setEditing(true)
  }

  function saveEdit() {
    if (!active || editNameError || !hasEdits) return
    setError(null)
    setInfo(null)
    update.mutate(
      {
        id: active.id,
        name: editNameTrimmed || undefined,
        domain: editForm.domain.trim() || undefined,
        description: editForm.description.trim() || undefined,
        roles: normalizedEditRoles.map((role, index) => ({ ...role, order: index }))
      },
      {
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Update failed'),
        onSuccess: () => {
          setInfo(`Updated “${active.name}”`)
          setEditing(false)
        }
      }
    )
  }

  async function deleteFrame() {
    if (!active) return
    setError(null)
    setInfo(null)
    const ok = await confirm({
      title: 'Delete Frame',
      description: `Are you sure you want to delete “${active.name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true
    })
    if (!ok) return
    remove.mutate(active.id, {
      onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Delete failed'),
      onSuccess: () => {
        setInfo(`Deleted “${active.name}”`)
        setSelected(null)
      }
    })
  }

  function moveRole(mode: 'create' | 'edit', index: number, delta: number) {
    if (mode === 'create') {
      setForm((prev) => {
        const roles = [...prev.roles]
        const target = index + delta
        if (target < 0 || target >= roles.length) return prev
        const [role] = roles.splice(index, 1)
        roles.splice(target, 0, role)
        return { ...prev, roles: roles.map((r, idx) => ({ ...r, order: idx })) }
      })
      return
    }
    setEditForm((prev) => {
      const roles = [...prev.roles]
      const target = index + delta
      if (target < 0 || target >= roles.length) return prev
      const [role] = roles.splice(index, 1)
      roles.splice(target, 0, role)
      return { ...prev, roles: roles.map((r, idx) => ({ ...r, order: idx })) }
    })
  }

  function removeRole(mode: 'create' | 'edit', index: number) {
    if (mode === 'create') {
      setForm(prev => ({
        ...prev,
        roles: prev.roles.filter((_, i) => i !== index).map((role, idx) => ({ ...role, order: idx }))
      }))
      return
    }
    setEditForm(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index).map((role, idx) => ({ ...role, order: idx }))
    }))
  }

  function addRole(mode: 'create' | 'edit') {
    const draft = mode === 'create' ? createRoleDraft : editRoleDraft
    const name = draft.name.trim()
    if (!name) return
    const exists = (mode === 'create' ? form.roles : editForm.roles).some(r => r.name === name)
    if (exists) return
    const role = { name, cardinality: draft.cardinality || DEFAULT_CARDINALITY, order: (mode === 'create' ? form.roles : editForm.roles).length }
    if (mode === 'create') {
      setForm(prev => ({ ...prev, roles: [...prev.roles, role] }))
      setCreateRoleDraft({ name: '', cardinality: DEFAULT_CARDINALITY })
    } else {
      setEditForm(prev => ({ ...prev, roles: [...prev.roles, role] }))
      setEditRoleDraft({ name: '', cardinality: DEFAULT_CARDINALITY })
    }
  }

  async function duplicateFrame() {
    if (!active) return
    setError(null)
    setInfo(null)
    const baseName = active.name.trim()
    let candidate = `${baseName} copy`
    let counter = 2
    while (frames.some(f => f.slug === slugify(candidate))) {
      candidate = `${baseName} copy ${counter++}`
    }
    create.mutate(
      {
        name: candidate,
        domain: active.domain ?? undefined,
        description: active.description ?? undefined,
        roles: normalizeFrameRoles(active.roles ?? []).map((role, idx) => ({ ...role, order: idx }))
      },
      {
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Duplicate failed'),
        onSuccess: () => setInfo(`Duplicated “${baseName}” as “${candidate}”`)
      }
    )
  }

  async function addExampleSense() {
    if (!active) return
    setError(null)
    setInfo(null)
    setSensePending(true)
    try {
      const response = await fetch('/api/senses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameId: active.id,
          gloss: `${active.name.toLowerCase()} example`,
          definition: `Example sense scaffold for ${active.name}`
        })
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to create example sense')
      }
      setInfo('Example sense created. Check the senses view for details.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create example sense')
    } finally {
      setSensePending(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 120px)' }}>
      <Paper variant="outlined" sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ flex: 1 }}>Frames</Typography>
          <Button size="small" variant="contained" onClick={openCreateDialog}>New</Button>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
          ) : (
            <List dense>
              {frames.map(f => (
                <ListItemButton key={f.id} selected={f.id === selected} onClick={() => { setSelected(f.id); setEditing(false); setInfo(null); setError(null) }}>
                  <ListItemText primary={f.name} secondary={f.domain || undefined} />
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {editing ? (
                <TextField
                  size="small"
                  label="Name"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  onBlur={() => setEditNameTouched(true)}
                  error={editNameTouched && Boolean(editNameError)}
                  helperText={editNameTouched && editNameError ? `${editNameError} · Slug preview: ${editSlug || '—'}` : `Slug preview: ${editSlug || '—'}`}
                />
              ) : (
                <Typography variant="h6">{active.name}</Typography>
              )}
              <Box sx={{ flex: 1 }} />
              {!editing && (
                <Tooltip title="Duplicate frame">
                  <span>
                    <Button size="small" variant="outlined" startIcon={<ContentCopyIcon fontSize="small" />} onClick={duplicateFrame} disabled={create.isPending}>
                      Duplicate
                    </Button>
                  </span>
                </Tooltip>
              )}
              {!editing && (
                <Tooltip title="Add an example sense">
                  <span>
                    <Button size="small" variant="outlined" startIcon={<AddIcon fontSize="small" />} onClick={addExampleSense} disabled={sensePending}>
                      Example sense
                    </Button>
                  </span>
                </Tooltip>
              )}
              {!editing && <Button size="small" onClick={startEdit}>Edit</Button>}
              {!editing && <Button size="small" color="error" onClick={deleteFrame}>Delete</Button>}
              {editing && <Button size="small" variant="contained" disabled={saveDisabled} onClick={saveEdit}>Save</Button>}
              {editing && <Button size="small" onClick={() => { setEditing(false); setEditNameTouched(false); setEditRoleDraft({ name: '', cardinality: DEFAULT_CARDINALITY }) }}>Cancel</Button>}
            </Box>

            {editing ? (
              <Stack direction="row" gap={2}>
                <TextField
                  size="small"
                  label="Domain"
                  value={editForm.domain}
                  onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))}
                  helperText="Domain = thematic grouping (e.g. exchange, perception)"
                />
                <TextField
                  size="small"
                  label="Slug"
                  value={editSlug}
                  InputProps={{ readOnly: true }}
                  sx={{ width: 200 }}
                />
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">Domain: {active.domain || '—'}</Typography>
            )}

            {editing ? (
              <TextField
                label="Description"
                multiline
                minRows={3}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                helperText="Describe the frame so collaborators share the same intent."
              />
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{active.description || 'No description.'}</Typography>
            )}

            <Divider />
            <Typography variant="subtitle2">Roles</Typography>

            {(!editing ? active.roles : editForm.roles).length === 0 && <Typography color="text.secondary" variant="body2">No roles defined.</Typography>}

            {!editing && active.roles.map(r => (
              <Box key={`${r.name}-${r.order}`} sx={{ display: 'flex', gap: 1, fontSize: 14 }}>
                <strong>{r.name}</strong>
                <span>({r.cardinality})</span>
              </Box>
            ))}

            {editing && editForm.roles.map((r, idx) => (
              <Box key={`${r.name}-${idx}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="Role"
                  value={r.name}
                  onChange={e => setEditForm(f => ({ ...f, roles: f.roles.map((rr, i) => i === idx ? { ...rr, name: e.target.value } : rr) }))}
                />
                <TextField
                  size="small"
                  label="Cardinality"
                  select
                  value={r.cardinality}
                  onChange={e => setEditForm(f => ({ ...f, roles: f.roles.map((rr, i) => i === idx ? { ...rr, cardinality: e.target.value } : rr) }))}
                  sx={{ width: 180 }}
                >
                  {CARDINALITY_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <Tooltip title="Move role up">
                  <span>
                    <IconButton size="small" onClick={() => moveRole('edit', idx, -1)} disabled={idx === 0}>
                      <ArrowUpwardIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move role down">
                  <span>
                    <IconButton size="small" onClick={() => moveRole('edit', idx, 1)} disabled={idx === editForm.roles.length - 1}>
                      <ArrowDownwardIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button size="small" onClick={() => removeRole('edit', idx)}>Remove</Button>
              </Box>
            ))}

            {editing && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="New role"
                  value={editRoleDraft.name}
                  onChange={e => setEditRoleDraft(d => ({ ...d, name: e.target.value }))}
                />
                <TextField
                  size="small"
                  label="Cardinality"
                  select
                  value={editRoleDraft.cardinality}
                  onChange={e => setEditRoleDraft(d => ({ ...d, cardinality: e.target.value }))}
                  sx={{ width: 180 }}
                >
                  {CARDINALITY_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <Button size="small" onClick={() => addRole('edit')}>Add</Button>
              </Box>
            )}

            {(error || info) && (
              <Alert severity={error ? 'error' : 'success'} onClose={() => { error ? setError(null) : setInfo(null) }}>
                {error ?? info}
              </Alert>
            )}
          </Stack>
        ) : (
          <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Select a frame to view details</Typography>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ width: 320, display: 'flex', flexDirection: 'column', p: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flex: 1 }}>Activity</Typography>
          <Chip size="small" color={activityConnected ? 'success' : 'default'} label={activityConnected ? 'Live' : 'Offline'} />
        </Box>
        <Divider sx={{ mb: 1 }} />
        {activityLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : activityEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No activity yet. Actions across the language will appear here.</Typography>
        ) : (
          <React.Fragment>
            <List dense>
              {activityEntries.map((entry) => (
                <ListItem key={entry.id} disableGutters alignItems="flex-start" sx={{ mb: 0.5 }}>
                  <Stack spacing={0.5} sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>{entry.summary}</Typography>
                      <Chip size="small" variant="outlined" label={entry.scope} />
                      {entry.entity && <Chip size="small" variant="outlined" label={entry.entity} />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatActivityMeta(entry)}
                    </Typography>
                  </Stack>
                </ListItem>
              ))}
            </List>
            {hasMoreActivity && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Button size="small" onClick={() => fetchMoreActivity()} disabled={loadingMoreActivity}>
                  {loadingMoreActivity ? 'Loading…' : 'Load more'}
                </Button>
              </Box>
            )}
          </React.Fragment>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Frame</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onBlur={() => setFormNameTouched(true)}
              error={formNameTouched && Boolean(formNameError)}
              helperText={formNameTouched && formNameError ? `${formNameError} · Slug preview: ${formSlug || '—'}` : `Slug preview: ${formSlug || '—'}`}
            />
            <TextField
              label="Domain"
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              helperText="Domain = thematic grouping (e.g. exchange, perception)"
            />
            <TextField
              label="Description"
              value={form.description}
              multiline
              minRows={3}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              helperText="Describe the frame so collaborators stay aligned."
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Role"
                value={createRoleDraft.name}
                onChange={e => setCreateRoleDraft(d => ({ ...d, name: e.target.value }))}
              />
              <TextField
                size="small"
                label="Cardinality"
                select
                value={createRoleDraft.cardinality}
                onChange={e => setCreateRoleDraft(d => ({ ...d, cardinality: e.target.value }))}
                sx={{ width: 180 }}
              >
                {CARDINALITY_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
              <Button size="small" onClick={() => addRole('create')}>Add</Button>
            </Box>
            {form.roles.map((r, idx) => (
              <Box key={`${r.name}-${idx}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{r.name}</strong>
                <span>({r.cardinality})</span>
                <Tooltip title="Move role up">
                  <span>
                    <IconButton size="small" onClick={() => moveRole('create', idx, -1)} disabled={idx === 0}>
                      <ArrowUpwardIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move role down">
                  <span>
                    <IconButton size="small" onClick={() => moveRole('create', idx, 1)} disabled={idx === form.roles.length - 1}>
                      <ArrowDownwardIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button size="small" onClick={() => removeRole('create', idx)}>Remove</Button>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createDisabled} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
