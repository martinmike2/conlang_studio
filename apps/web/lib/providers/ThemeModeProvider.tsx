"use client"
import * as React from 'react'
import { CssBaseline, ThemeProvider, createTheme, PaletteMode } from '@mui/material'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { ThemeModeContext, ThemeModeContextValue } from './ThemeModeContext'

function buildTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#90caf9' : '#455a64' },
      secondary: { main: '#ffa000' },
      background: mode === 'dark'
        ? { default: '#121212', paper: '#1e1e1e' }
        : { default: '#fafafa', paper: '#ffffff' }
    },
    typography: { fontFamily: 'Roboto, system-ui, sans-serif', fontSize: 14 },
    components: {
      MuiPaper: { styleOverrides: { root: { transition: 'background-color .25s ease' } } }
    }
  })
}

type SetMode = React.Dispatch<React.SetStateAction<PaletteMode>>
function usePersistedMode(): [PaletteMode, SetMode] {
  const [mode, setMode] = React.useState<PaletteMode>('dark')
  React.useEffect(() => {
    let stored: PaletteMode | null = null
    try {
      const ls: Storage | undefined = typeof globalThis !== 'undefined' && typeof (globalThis as { localStorage?: Storage }).localStorage !== 'undefined'
        ? (globalThis as { localStorage?: Storage }).localStorage
        : undefined
      if (ls) {
        const raw = ls.getItem('themeMode') as PaletteMode | null
        if (raw === 'light' || raw === 'dark') stored = raw
      }
    } catch {/* ignore retrieval errors */}
    if (stored) setMode(stored)
  }, [])
  const setPersisted = React.useCallback((val: React.SetStateAction<PaletteMode>) => {
    setMode((prev: PaletteMode) => {
  // Use a short, explicit any-cast here to call a possible updater function. It's guarded by typeof check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const next = typeof val === 'function' ? (val as any)(prev) as PaletteMode : val
      try {
        const ls: Storage | undefined = typeof globalThis !== 'undefined' && typeof (globalThis as { localStorage?: Storage }).localStorage !== 'undefined'
          ? (globalThis as { localStorage?: Storage }).localStorage
          : undefined
        ls?.setItem('themeMode', next)
      } catch {/* ignore set errors */}
      return next
    })
  }, [])
  return [mode, setPersisted]
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = usePersistedMode()
  const theme = React.useMemo(() => buildTheme(mode), [mode])
  const value = React.useMemo<ThemeModeContextValue>(() => ({
    mode,
    toggle: () => setMode((_m) => (_m === 'dark' ? 'light' : 'dark'))
  }), [mode, setMode])

  return (
    <CacheProvider value={createCache({ key: 'mui' })}>
      <ThemeModeContext.Provider value={value}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </CacheProvider>
  )
}
