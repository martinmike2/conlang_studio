"use client"
import * as React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material'

export interface ConfirmOptions {
  title?: string
  description?: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

// eslint-disable-next-line no-unused-vars
type ConfirmationContextType = (_: ConfirmOptions) => Promise<boolean>

const ConfirmationContext = React.createContext<ConfirmationContextType | null>(null)

export function useConfirm(): ConfirmationContextType {
  const fn = React.useContext(ConfirmationContext)
  if (!fn) throw new Error('useConfirm must be used within a ConfirmationProvider')
  return fn
}

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [opts, setOpts] = React.useState<ConfirmOptions>({})
  // eslint-disable-next-line no-unused-vars
  const resolverRef = React.useRef<((_: boolean) => void) | null>(null)

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
      setOpts(options)
      setOpen(true)
    })
  }, [])

  const close = (result: boolean) => {
    setOpen(false)
    const r = resolverRef.current
    resolverRef.current = null
    if (r) r(result)
  }

  const { title = 'Confirm', description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive } = opts

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        {description && (
          <DialogContent>
            {typeof description === 'string' ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{description}</Typography>
            ) : description}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => close(false)}>{cancelLabel}</Button>
          <Button onClick={() => close(true)} color={destructive ? 'error' : 'primary'} variant={destructive ? 'contained' : 'text'} autoFocus>
            {confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmationContext.Provider>
  )
}
