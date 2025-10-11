"use client"

import { useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert
} from "@mui/material"
import {
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  History as HistoryIcon,
  Lightbulb as LightbulbIcon
} from "@mui/icons-material"

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

interface EvolutionTimelineProps {
  languageId: number
  entries: DiachronyTimelineEntry[]
  onRefresh?: () => void
}

export function EvolutionTimeline({ entries }: EvolutionTimelineProps) {
  const [groupBy, setGroupBy] = useState<"all" | "month" | "quarter">("all")
  const [filterType, setFilterType] = useState<"all" | "lexical" | "semantic">("all")

  const filteredEntries = entries.filter(entry => {
    if (filterType === "all") return true
    if (filterType === "lexical") return entry.kind === "lexical-change"
    if (filterType === "semantic") return entry.kind === "semantic-shift"
    return true
  })

  const groupedEntries = groupBy === "all" 
    ? [{ period: "All Time", entries: filteredEntries }]
    : groupEntriesByPeriod(filteredEntries, groupBy)

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter Type</InputLabel>
          <Select
            value={filterType}
            label="Filter Type"
            onChange={(e) => setFilterType(e.target.value as "all" | "lexical" | "semantic")}
          >
            <MenuItem value="all">All Changes</MenuItem>
            <MenuItem value="lexical">Lexical Only</MenuItem>
            <MenuItem value="semantic">Semantic Only</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Group By</InputLabel>
          <Select
            value={groupBy}
            label="Group By"
            onChange={(e) => setGroupBy(e.target.value as "all" | "month" | "quarter")}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="quarter">Quarter</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {filteredEntries.length === 0 && (
        <Alert severity="info">
          No diachronic changes recorded yet. Evolution events will appear here.
        </Alert>
      )}

      {groupedEntries.map((group, idx) => (
        <Box key={idx} sx={{ mb: 4 }}>
          {groupBy !== "all" && (
            <Typography variant="h6" sx={{ mb: 2, color: "text.secondary" }}>
              {group.period}
            </Typography>
          )}
          
          <Stack spacing={2}>
            {group.entries.map((entry, entryIdx) => (
              <Box key={entry.record.id} sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ minWidth: 100, textAlign: "right", pt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(entry.record.createdAt)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: entry.kind === "lexical-change" ? "primary.main" : "secondary.main",
                      color: "white"
                    }}
                  >
                    {getTimelineIcon(entry.kind, entry.record.changeType ?? entry.record.shiftType)}
                  </Box>
                  {entryIdx < group.entries.length - 1 && (
                    <Box sx={{ width: 2, flex: 1, minHeight: 40, bgcolor: "divider" }} />
                  )}
                </Box>
                
                <Box sx={{ flex: 1, pb: 2 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip 
                          label={entry.kind === "lexical-change" ? "Lexical" : "Semantic"}
                          size="small"
                          color={entry.kind === "lexical-change" ? "primary" : "secondary"}
                        />
                        <Chip 
                          label={entry.record.changeType ?? entry.record.shiftType ?? "unknown"}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      
                      {entry.record.note && (
                        <Typography variant="body2" color="text.secondary">
                          {entry.record.note}
                        </Typography>
                      )}
                      
                      {renderMetadata(entry)}
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  )
}

function groupEntriesByPeriod(
  entries: DiachronyTimelineEntry[], 
  groupBy: "month" | "quarter"
): Array<{ period: string; entries: DiachronyTimelineEntry[] }> {
  const groups = new Map<string, DiachronyTimelineEntry[]>()
  
  for (const entry of entries) {
    const date = new Date(entry.record.createdAt)
    const period = groupBy === "month" 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
    
    if (!groups.has(period)) {
      groups.set(period, [])
    }
    groups.get(period)!.push(entry)
  }
  
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([period, entries]) => ({ period, entries }))
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString(undefined, { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  })
}



function getTimelineIcon(kind: string, type?: string) {
  if (type === "innovation") return <LightbulbIcon fontSize="small" />
  if (kind === "semantic-shift") return <PsychologyIcon fontSize="small" />
  if (kind === "lexical-change") return <TrendingUpIcon fontSize="small" />
  return <HistoryIcon fontSize="small" />
}

function renderMetadata(entry: DiachronyTimelineEntry) {
  if (entry.kind === "lexical-change" && entry.record.meta) {
    const meta = entry.record.meta as Record<string, unknown>
    if (meta.before && meta.after) {
      return (
        <Typography variant="caption" display="block" sx={{ mt: 1, fontFamily: "monospace" }}>
          {String(meta.before)} → {String(meta.after)}
          {meta.confidence ? ` (${(Number(meta.confidence) * 100).toFixed(0)}%)` : ""}
        </Typography>
      )
    }
  }
  
  if (entry.kind === "semantic-shift" && entry.record.trigger) {
    const trigger = entry.record.trigger as Record<string, unknown>
    if (trigger.targetDomain) {
      return (
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Target domain: {String(trigger.targetDomain)}
        </Typography>
      )
    }
  }
  
  return null
}
