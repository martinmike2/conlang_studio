"use client"
import * as React from 'react'
import { Alert, Box, Button, Chip, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Slider, Stack, TextField, Typography } from '@mui/material'

import type { StylePolicy, StylePolicyEvaluation } from '@core/register'

type PolicyWithMeta = StylePolicy & { createdAt: string }

type EditableSample = {
  id: string
  text: string
  register: string
  tagsInput: string
  formality?: number
}

type EvaluationResponse = StylePolicyEvaluation & { issuedAt: string }

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'sample-' + Math.random().toString(36).slice(2, 9)
}

function createBlankSample(): EditableSample {
  return {
    id: generateId(),
    text: '',
    register: '',
    tagsInput: '',
    formality: undefined
  }
}

function formatTagsInput(tags: string[]) {
  return tags.join(', ')
}

function renderRuleSummary(rule: StylePolicy['rules'][number]) {
  const chips: string[] = []
  if (rule.forbidWords.length) chips.push(`forbid words: ${rule.forbidWords.join(', ')}`)
  if (rule.forbidPatterns.length) chips.push(`forbid patterns: ${rule.forbidPatterns.length}`)
  if (rule.allowedRegisters.length) chips.push(`allowed registers: ${rule.allowedRegisters.join(', ')}`)
  if (rule.requireTags.length) chips.push(`require tags: ${rule.requireTags.join(', ')}`)
  if (rule.maxSentenceLength) chips.push(`max sentence length: ${rule.maxSentenceLength}`)
  if (rule.minFormality !== undefined) chips.push(`min formality: ${rule.minFormality}`)
  return chips.join(' • ')
}

export default function RegisterAuditPanel() {
  const [policies, setPolicies] = React.useState<PolicyWithMeta[]>([])
  const [policiesLoading, setPoliciesLoading] = React.useState(false)
  const [policiesError, setPoliciesError] = React.useState<string | null>(null)
  const [selectedPolicyId, setSelectedPolicyId] = React.useState<number | ''>('')
  const [samples, setSamples] = React.useState<EditableSample[]>(() => [createBlankSample()])
  const [evaluateError, setEvaluateError] = React.useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = React.useState(false)
  const [evaluation, setEvaluation] = React.useState<EvaluationResponse | null>(null)

  const selectedPolicy = React.useMemo(() => {
    return typeof selectedPolicyId === 'number' ? policies.find((p) => p.id === selectedPolicyId) ?? null : null
  }, [policies, selectedPolicyId])

  React.useEffect(() => {
    async function loadPolicies() {
      setPoliciesLoading(true)
      setPoliciesError(null)
      try {
        const res = await fetch('/api/register/policies', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(body?.error?.message ?? 'Failed to fetch policies')
        }
        const fetched = (body?.data ?? []) as PolicyWithMeta[]
        setPolicies(fetched)
        setSelectedPolicyId((prev) => (prev === '' && fetched.length ? fetched[0].id : prev))
      } catch (error: unknown) {
        setPoliciesError((error as Error)?.message ?? 'Failed to load policies')
      } finally {
        setPoliciesLoading(false)
      }
    }

    loadPolicies()
  }, [])

  function updateSample(id: string, patch: Partial<EditableSample>) {
    setSamples((prev) => prev.map((sample) => (sample.id === id ? { ...sample, ...patch } : sample)))
  }

  function addSample() {
    setSamples((prev) => [...prev, createBlankSample()])
  }

  function removeSample(id: string) {
    setSamples((prev) => {
      const next = prev.filter((sample) => sample.id !== id)
      return next.length ? next : [createBlankSample()]
    })
  }

  async function evaluate() {
    if (!selectedPolicy) {
      setEvaluateError('Select a style policy to evaluate')
      return
    }

    const preparedSamples = samples
      .map((sample) => ({
        id: sample.id,
        text: sample.text.trim(),
        register: sample.register.trim() || undefined,
        tags: sample.tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
        formality: sample.formality
      }))
      .filter((sample) => sample.text.length > 0)

    if (!preparedSamples.length) {
      setEvaluateError('Add at least one sample with text to evaluate')
      return
    }

    setEvaluateError(null)
    setIsEvaluating(true)

    try {
      const res = await fetch('/api/register/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: selectedPolicy.id, samples: preparedSamples })
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error?.message ?? 'Evaluation failed')
      }
      setEvaluation({ ...(body?.data as StylePolicyEvaluation), issuedAt: new Date().toISOString() })
    } catch (error: unknown) {
      setEvaluateError((error as Error)?.message ?? 'Evaluation failed')
      setEvaluation(null)
    } finally {
      setIsEvaluating(false)
    }
  }

  function hydrateSamplesFromEvaluation(result: StylePolicyEvaluation) {
    setSamples(result.samples.map((sample) => ({
      id: sample.sampleId,
      text: sample.text,
      register: sample.register ?? '',
      tagsInput: formatTagsInput(sample.tags),
      formality: undefined
    })))
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h4" gutterBottom>Register &amp; Style Audit</Typography>
        <Typography variant="body1" color="text.secondary">
          Evaluate example phrases or lexemes against saved style policies. Use this panel to confirm register alignment, forbidden vocab, and stylistic constraints before promoting new material.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h6">1. Choose a style policy</Typography>
          <FormControl fullWidth disabled={policiesLoading}>
            <InputLabel id="policy-select-label">Style policy</InputLabel>
            <Select
              labelId="policy-select-label"
              label="Style policy"
              value={selectedPolicyId}
              onChange={(event) => setSelectedPolicyId(Number(event.target.value))}
            >
              {policies.map((policy) => (
                <MenuItem key={policy.id} value={policy.id}>{policy.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {policiesError ? <Alert severity="error">{policiesError}</Alert> : null}
          {selectedPolicy ? (
            <Box>
              {selectedPolicy.description ? (
                <Typography variant="body2" sx={{ mb: 1 }}>{selectedPolicy.description}</Typography>
              ) : null}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{selectedPolicy.rules.length} rules</Typography>
              <Stack spacing={1}>
                {selectedPolicy.rules.map((rule) => (
                  <Paper key={rule.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2">{rule.description ?? `Rule ${rule.id}`}</Typography>
                    <Typography variant="body2" color="text.secondary">{renderRuleSummary(rule) || 'No constraints recorded for this rule.'}</Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h6">2. Provide samples</Typography>
          <Typography variant="body2" color="text.secondary">Text is required. Register, tags (comma separated), and formality (0—1) are optional.</Typography>
          <Stack spacing={2}>
            {samples.map((sample, index) => (
              <Paper key={sample.id} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Sample #{index + 1}</Typography>
                    <Button color="error" size="small" onClick={() => removeSample(sample.id)}>Remove</Button>
                  </Stack>
                  <TextField
                    label="Text"
                    multiline
                    minRows={2}
                    value={sample.text}
                    onChange={(event) => updateSample(sample.id, { text: event.target.value })}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="Register"
                      value={sample.register}
                      onChange={(event) => updateSample(sample.id, { register: event.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Tags (comma separated)"
                      value={sample.tagsInput}
                      onChange={(event) => updateSample(sample.id, { tagsInput: event.target.value })}
                      fullWidth
                    />
                  </Stack>
                  <Box>
                    <Typography variant="caption" display="block" gutterBottom>Formality score (0 informal → 1 formal)</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Slider
                        value={typeof sample.formality === 'number' ? sample.formality : 0.5}
                        step={0.1}
                        min={0}
                        max={1}
                        onChange={(_, value) => updateSample(sample.id, { formality: Array.isArray(value) ? value[0] : value })}
                      />
                      <Chip label={typeof sample.formality === 'number' ? sample.formality.toFixed(2) : 'n/a'} />
                      <Button size="small" onClick={() => updateSample(sample.id, { formality: undefined })}>Clear</Button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Button variant="outlined" onClick={addSample} sx={{ alignSelf: 'flex-start' }}>Add sample</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">3. Run audit</Typography>
          {evaluateError ? <Alert severity="error">{evaluateError}</Alert> : null}
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={evaluate} disabled={isEvaluating}>
              {isEvaluating ? 'Evaluating…' : 'Evaluate samples'}
            </Button>
            {evaluation ? <Button variant="text" onClick={() => hydrateSamplesFromEvaluation(evaluation)}>Load last evaluation</Button> : null}
          </Stack>
        </Stack>
      </Paper>

      {evaluation ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6">Results</Typography>
              <Typography variant="body2" color="text.secondary">Policy “{evaluation.policy.name}” • {evaluation.policy.ruleCount} rules • evaluated {evaluation.summary.evaluated} sample(s)</Typography>
            </Box>
            <Alert severity={evaluation.summary.failed ? 'warning' : 'success'}>
              {evaluation.summary.failed ? (
                <Typography component="span">{evaluation.summary.failed} of {evaluation.summary.evaluated} samples failed with {evaluation.summary.violationCount} violation(s).</Typography>
              ) : (
                <Typography component="span">All samples passed style policy checks.</Typography>
              )}
            </Alert>
            <Stack spacing={2}>
              {evaluation.samples.map((sample) => (
                <Paper key={sample.sampleId} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                      <Typography variant="subtitle2">Sample “{sample.sampleId}”</Typography>
                      <Typography variant="caption" color="text.secondary">{sample.register ? `Register: ${sample.register}` : 'Register: n/a'}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{sample.text}</Typography>
                    <Typography variant="caption" color="text.secondary">Tags: {sample.tags.length ? sample.tags.join(', ') : 'n/a'}</Typography>
                    <Divider sx={{ my: 1 }} />
                    {sample.violations.length ? (
                      <Stack spacing={1}>
                        <Typography variant="subtitle2">Violations</Typography>
                        {sample.violations.map((violation, index) => (
                          <Alert key={violation.ruleId + index} severity="warning" variant="outlined">
                            <Typography variant="body2">{violation.reason}</Typography>
                            {violation.detail ? <Typography variant="caption" color="text.secondary">{violation.detail}</Typography> : null}
                          </Alert>
                        ))}
                      </Stack>
                    ) : (
                      <Alert severity="success" variant="outlined">No violations detected for this sample.</Alert>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ) : null}
    </Box>
  )
}
