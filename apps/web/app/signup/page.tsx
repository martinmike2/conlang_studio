"use client"
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: 'Registration failed' } }))
      setError(body?.error?.message ?? 'Registration failed')
      setSubmitting(false)
      return
    }

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/languages'
    })

    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    router.replace(result?.url ?? '/languages')
  }

  return (
    <Paper elevation={6} sx={{ maxWidth: 420, width: '100%', p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Create your workspace
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Set up an account to start managing languages.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Name"
            value={name}
            onChange={event => setName(event.target.value)}
            required
            fullWidth
            autoComplete="name"
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            fullWidth
            autoComplete="new-password"
            helperText="Minimum 8 characters"
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3 }}>
        Already have an account?{' '}
        <Button component={Link} href="/signin" variant="text" size="small">
          Sign in
        </Button>
      </Typography>
    </Paper>
  )
}
