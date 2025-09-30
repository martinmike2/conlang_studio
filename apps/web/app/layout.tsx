import './globals.css'
import * as React from 'react'
import type { ReactNode } from 'react'
import { AppShell } from '../lib/ui/AppShell'
import { QueryProvider } from '../lib/providers/QueryProvider'
import { ThemeModeProvider } from '../lib/providers/ThemeModeProvider'
import { ConfirmationProvider } from '../lib/providers/ConfirmationProvider'

export const metadata = {
  title: 'Conlang Studio',
  description: 'Constructed language design workspace'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeModeProvider>
          <QueryProvider>
            <ConfirmationProvider>
              <AppShell>{children}</AppShell>
            </ConfirmationProvider>
          </QueryProvider>
        </ThemeModeProvider>
      </body>
    </html>
  )
}
