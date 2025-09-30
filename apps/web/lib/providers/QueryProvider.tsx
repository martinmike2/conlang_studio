"use client"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

let singletonClient: QueryClient | null = null

function getClient() {
  if (!singletonClient) {
    singletonClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 15_000,
          refetchOnWindowFocus: false,
        }
      }
    })
  }
  return singletonClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = getClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
