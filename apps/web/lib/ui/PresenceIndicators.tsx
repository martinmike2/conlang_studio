'use client'

import React from 'react'
import { Box, Chip, Avatar, Tooltip } from '@mui/material'
import { Person as PersonIcon } from '@mui/icons-material'

export interface PresenceUser {
  id?: string
  name?: string
  color?: string
}

export interface PresenceIndicatorsProps {
  users: PresenceUser[]
  maxVisible?: number
}

/**
 * Displays presence indicators showing who else is currently editing
 */
export function PresenceIndicators({ users, maxVisible = 5 }: PresenceIndicatorsProps) {
  // Deduplicate users by ID (in case of duplicate connections)
  const uniqueUsers = React.useMemo(() => {
    const seen = new Map<string, PresenceUser>()
    users.forEach((user) => {
      const key = user.id || Math.random().toString()
      if (!seen.has(key)) {
        seen.set(key, user)
      }
    })
    return Array.from(seen.values())
  }, [users])

  const visible = uniqueUsers.slice(0, maxVisible)
  const overflow = uniqueUsers.length - maxVisible

  if (uniqueUsers.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
      {visible.map((user, index) => {
        const displayName = user.name || user.id || 'Anonymous'
        const initials = displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <Tooltip key={`${user.id}-${index}`} title={displayName} arrow>
            <Chip
              avatar={
                <Avatar
                  sx={{
                    bgcolor: user.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
                    width: 24,
                    height: 24,
                    fontSize: '0.75rem'
                  }}
                >
                  {initials}
                </Avatar>
              }
              label={displayName}
              size="small"
              variant="outlined"
              sx={{ height: 28 }}
            />
          </Tooltip>
        )
      })}
      {overflow > 0 && (
        <Chip
          icon={<PersonIcon fontSize="small" />}
          label={`+${overflow}`}
          size="small"
          variant="filled"
          sx={{ height: 28 }}
        />
      )}
    </Box>
  )
}

export default PresenceIndicators
