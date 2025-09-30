"use client"
import * as React from 'react'
import { PaletteMode } from '@mui/material'

export interface ThemeModeContextValue {
  mode: PaletteMode
  toggle: () => void
}

export const ThemeModeContext = React.createContext<ThemeModeContextValue | undefined>(undefined)

export function useThemeMode() {
  const ctx = React.useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider')
  return ctx
}
