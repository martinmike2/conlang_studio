"use client"
import * as React from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserLanguage } from '../../lib/types/language'
import { useActiveLanguage } from '../../lib/providers/ActiveLanguageProvider'

async function fetchLanguages(): Promise<UserLanguage[]> {
  const res = await fetch('/api/languages', { cache: 'no-store' })
  if (res.status === 401) return []
  if (!res.ok) throw new Error('Failed to load languages')
  const body = await res.json() as { data?: UserLanguage[] }
  return body.data ?? []
}

async function createLanguage(payload: { name: string; slug?: string }): Promise<UserLanguage> {
  const res = await fetch('/api/languages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Unable to create language' } }))
    throw new Error(body?.error?.message ?? 'Unable to create language')
  }
  const json = await res.json() as { data: UserLanguage }
  return json.data
}

export default function LanguagesPage() {
  const { status } = useSession()
  const queryClient = useQueryClient()
  const { activeLanguage, setActiveLanguage } = useActiveLanguage()
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const languagesQuery = useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    enabled: status === 'authenticated',
    staleTime: 30_000
  })

  const createLanguageMutation = useMutation({
    mutationFn: createLanguage,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['languages'] })
      setName('')
      setSlug('')
      setActiveLanguage(created)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to create language')
    }
  })

  React.useEffect(() => {
    if (languagesQuery.data && activeLanguage) {
      const exists = languagesQuery.data.some(lang => lang.id === activeLanguage.id)
      if (!exists) {
        setActiveLanguage(null)
      }
    }
  }, [languagesQuery.data, activeLanguage, setActiveLanguage])

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Sign in required
        </Typography>
        <Typography color="text.secondary">
          Create an account or sign in to manage your languages.
        </Typography>
      </Box>
    )
  }

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedName) {
      setError('Name is required')
      return
    }
    createLanguageMutation.mutate({
      name: trimmedName,
      slug: trimmedSlug || undefined
    })
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Your languages
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Select a language to focus the workspace. You can own multiple languages and collaborate with others.
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card component="form" onSubmit={handleCreate}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Create a language</Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="Name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Slug (optional)"
                  value={slug}
                  onChange={event => setSlug(event.target.value)}
                  fullWidth
                  helperText="Lowercase letters, numbers, and hyphens"
                />
                <Button type="submit" variant="contained" disabled={createLanguageMutation.isPending}>
                  {createLanguageMutation.isPending ? 'Creating…' : 'Create language'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Available languages</Typography>
                {languagesQuery.isLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
                {languagesQuery.isError && (
                  <Alert severity="error">Unable to load languages.</Alert>
                )}
                {!languagesQuery.isLoading && !languagesQuery.isError && (languagesQuery.data?.length ?? 0) === 0 && (
                  <Typography color="text.secondary">
                    You have not created any languages yet.
                  </Typography>
                )}
                {!languagesQuery.isLoading && !languagesQuery.isError && (languagesQuery.data?.length ?? 0) > 0 && (
                  <Stack spacing={1}>
                    {languagesQuery.data!.map(language => {
                      const isActive = activeLanguage?.id === language.id
                      return (
                        <Card key={language.id} variant="outlined" sx={{ borderColor: isActive ? 'primary.main' : undefined }}>
                          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                            <Box>
                              <Typography variant="subtitle1">{language.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {language.slug}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip label={language.role} size="small" color={language.role === 'owner' ? 'primary' : 'default'} />
                              <Button
                                variant={isActive ? 'outlined' : 'text'}
                                onClick={() => setActiveLanguage(language)}
                                size="small"
                              >
                                {isActive ? 'Active' : 'Set active'}
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
