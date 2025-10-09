import './globals.css'
import * as React from 'react'
import type { ReactNode } from 'react'
import { AppShell } from '../lib/ui/AppShell'
import { ClientProviders } from '../lib/providers/ClientProviders'
import { auth } from '../lib/auth/nextAuth'

export const metadata = {
  title: 'Conlang Studio',
  description: 'Constructed language design workspace'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  return (
    <html lang="en">
      <body>
        <ClientProviders session={session}>
          <AppShell>{children}</AppShell>
        </ClientProviders>
      </body>
    </html>
  )
}
