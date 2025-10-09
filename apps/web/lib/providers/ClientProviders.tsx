"use client"
import * as React from 'react'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ThemeModeProvider } from './ThemeModeProvider'
import { QueryProvider } from './QueryProvider'
import { ConfirmationProvider } from './ConfirmationProvider'
import { ActiveLanguageProvider } from './ActiveLanguageProvider'

export function ClientProviders({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <ThemeModeProvider>
        <QueryProvider>
          <ConfirmationProvider>
            <ActiveLanguageProvider>
              {children}
            </ActiveLanguageProvider>
          </ConfirmationProvider>
        </QueryProvider>
      </ThemeModeProvider>
    </SessionProvider>
  )
}
