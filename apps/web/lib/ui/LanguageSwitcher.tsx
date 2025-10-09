"use client"
import * as React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Button
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import type { UserLanguage } from '../types/language'
import { useActiveLanguage } from '../providers/ActiveLanguageProvider'

async function fetchLanguages(): Promise<UserLanguage[]> {
  const res = await fetch('/api/languages', { cache: 'no-store' })
  if (res.status === 401) return []
  if (!res.ok) throw new Error('Failed to load languages')
  const body = await res.json() as { data?: UserLanguage[] }
  return body.data ?? []
}

interface LanguageSwitcherProps {
  onSelect?: () => void
}

export function LanguageSwitcher({ onSelect }: LanguageSwitcherProps) {
  const { status } = useSession()
  const { activeLanguage, setActiveLanguage } = useActiveLanguage()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    enabled: status === 'authenticated',
    staleTime: 30_000
  })

  React.useEffect(() => {
    if (!data || !activeLanguage) return
    const stillExists = data.some(lang => lang.id === activeLanguage.id)
    if (!stillExists) {
      setActiveLanguage(null)
    }
  }, [data, activeLanguage, setActiveLanguage])

  if (status !== 'authenticated') {
    return null
  }

  const handleChange = (event: SelectChangeEvent<string>) => {
    if (!data) return
    const value = event.target.value
    if (!value) {
      setActiveLanguage(null)
      onSelect?.()
      return
    }
    const numericId = Number(value)
    if (Number.isNaN(numericId)) return
    const next = data.find(lang => lang.id === numericId)
    if (next) {
      setActiveLanguage(next)
      onSelect?.()
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <FormControl fullWidth size="small">
        <InputLabel id="language-switcher-label">Language</InputLabel>
        <Select
          labelId="language-switcher-label"
          label="Language"
          value={activeLanguage ? String(activeLanguage.id) : ''}
          onChange={handleChange}
          displayEmpty
          disabled={isLoading}
        >
          <MenuItem value="">
            <em>{isLoading ? 'Loading…' : 'No selection'}</em>
          </MenuItem>
          {data?.map(language => (
            <MenuItem key={language.id} value={String(language.id)}>
              {language.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {isLoading && (
        <CircularProgress size={18} sx={{ position: 'absolute', top: '50%', right: 16, mt: '-9px' }} />
      )}
      {isError && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          Unable to load languages – retry shortly
        </Typography>
      )}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <Button
          component={Link}
          href="/languages"
          size="small"
          variant="outlined"
          sx={{ mt: 1 }}
          onClick={onSelect}
        >
          Create a language
        </Button>
      )}
    </Box>
  )
}
