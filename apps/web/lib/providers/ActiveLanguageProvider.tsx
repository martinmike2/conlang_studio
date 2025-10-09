"use client"
import * as React from 'react'
import { useSession } from 'next-auth/react'
import type { UserLanguage } from '../types/language'

interface ActiveLanguageContextValue {
  activeLanguage: UserLanguage | null
  setActiveLanguage: (language: UserLanguage | null) => void
}

const ActiveLanguageContext = React.createContext<ActiveLanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'activeLanguage'

function readStoredLanguage(): UserLanguage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserLanguage
    if (parsed && typeof parsed.id === 'number') {
      return {
        id: parsed.id,
        name: parsed.name,
        slug: parsed.slug,
        role: parsed.role ?? 'owner',
        createdAt: parsed.createdAt ?? new Date().toISOString()
      }
    }
  } catch {
    return null
  }
  return null
}

export function ActiveLanguageProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [activeLanguage, setActiveLanguageState] = React.useState<UserLanguage | null>(() => readStoredLanguage())

  const setActiveLanguage = React.useCallback((language: UserLanguage | null) => {
    setActiveLanguageState(language)
    if (typeof window === 'undefined') return
    try {
      if (language) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(language))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      /* ignore storage write errors */
    }
  }, [])

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      setActiveLanguage(null)
    }
  }, [status, setActiveLanguage])

  const value = React.useMemo<ActiveLanguageContextValue>(() => ({ activeLanguage, setActiveLanguage }), [activeLanguage, setActiveLanguage])

  return (
    <ActiveLanguageContext.Provider value={value}>
      {children}
    </ActiveLanguageContext.Provider>
  )
}

export function useActiveLanguage() {
  const ctx = React.useContext(ActiveLanguageContext)
  if (!ctx) {
    throw new Error('useActiveLanguage must be used within an ActiveLanguageProvider')
  }
  return ctx
}
