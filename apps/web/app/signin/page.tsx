"use client"
import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert
} from '@mui/material'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') ?? '/dashboard'
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl
    })
    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error)
      setSubmitting(false)
      return
    }
    router.replace(result?.url ?? callbackUrl)
  }

  return (
    <Paper elevation={6} sx={{ maxWidth: 420, width: '100%', p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome back
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Sign in to continue working on your languages.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
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
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3 }}>
        Need an account?{' '}
        <Button component={Link} href="/signup" variant="text" size="small">
          Create one
        </Button>
      </Typography>
    </Paper>
  )
}
