"use client"

import { useState, useEffect, useCallback } from "react"
import { useActiveLanguage } from "../../../lib/providers/ActiveLanguageProvider"

interface DiachronyTimelineEntry {
  kind: "lexical-change" | "semantic-shift"
  record: {
    id: number
    languageId: number
    changeType?: string
    shiftType?: string
    note: string | null
    createdAt: Date | string
    meta?: Record<string, unknown>
    trigger?: Record<string, unknown>
  }
}
import { Box, Container, Typography, Button, CircularProgress, Alert } from "@mui/material"
import { Refresh as RefreshIcon } from "@mui/icons-material"
import { EvolutionTimeline } from "../../../lib/ui/EvolutionTimeline"

export default function TimelinePage() {
  const { activeLanguage } = useActiveLanguage()
  const languageId = activeLanguage?.id ?? 1
  const [entries, setEntries] = useState<DiachronyTimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/diachrony/timeline?languageId=${languageId}&limit=100`)
      if (!response.ok) {
        throw new Error("Failed to fetch timeline")
      }
      const data = await response.json()
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [languageId])

  useEffect(() => {
    fetchTimeline()
  }, [languageId, fetchTimeline])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Evolution Timeline
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchTimeline}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <EvolutionTimeline
          languageId={languageId}
          entries={entries}
          onRefresh={fetchTimeline}
        />
      )}
    </Container>
  )
}
