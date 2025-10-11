'use client'

import React, { useEffect, useState } from 'react'
import { Box, TextField, Typography, Paper, Container } from '@mui/material'
import CollabProvider from '../../../lib/ui/CollabProvider'
import PresenceIndicators from '../../../lib/ui/PresenceIndicators'
import useCollab from '../../../lib/hooks/useCollab'
import { useSearchParams } from 'next/navigation'

function TestInner({ roomId }: { roomId: string }) {
  const collab = useCollab()
  const [doc, setDoc] = useState<any>(null)
  const [text, setText] = useState('')
  const [presence, setPresence] = useState<any[]>([])

  useEffect(() => {
    let unsub: any
    const useMock = !roomId.includes('real')
    // Enable API persistence for real mode
    collab.getDoc(roomId, { mock: useMock, usePersistence: !useMock }).then((d: any) => {
      setDoc(d)
      setText(d.state.text || '')
      unsub = d.subscribe((s: any) => {
        setText(s.text || '')
      })
    })
    return () => {
      if (unsub) unsub()
      // Don't destroy the doc - let CollabProvider manage lifecycle
    }
  }, [roomId])

  useEffect(() => {
    // subscribe to presence updates from provider
    const unsub = collab.subscribe((p: any[]) => setPresence(p || []))
    setPresence(collab.presence || [])
    return () => unsub && unsub()
  }, [collab])

  async function onChange(e: any) {
    const v = e.target.value
    setText(v)
    if (doc) doc.update({ text: v })
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Collaboration Test Room
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Room ID: <code>{roomId}</code>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Users:
          </Typography>
          <PresenceIndicators users={presence} />
        </Box>

        <TextField
          label="Shared Content"
          multiline
          rows={10}
          fullWidth
          value={text}
          onChange={onChange}
          variant="outlined"
          placeholder="Start typing... changes will sync in real-time"
          sx={{ mb: 2 }}
        />

        <Typography variant="caption" color="text.secondary">
          Open this page in multiple tabs or browsers to test real-time collaboration
        </Typography>
      </Paper>
    </Container>
  )
}

export default function Page() {
  const params = useSearchParams()
  const useReal = params?.get('real') === '1'
  const roomId = useReal ? 'real-demo-room' : 'demo-room'
  
  return (
    <CollabProvider enableMock={!useReal}>
      <TestInner roomId={roomId} />
    </CollabProvider>
  )
}
