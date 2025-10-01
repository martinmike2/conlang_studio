import React from 'react'
import WizardStepper from '../../lib/ui/WizardStepper'
import { Box, Paper, Typography } from '@mui/material'

export default function WizardPage() {
  const steps = ['Phonology', 'Morphology', 'Semantics', 'Orthography', 'Lexicon', 'QA']

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Language Setup Wizard (Phase 1)
      </Typography>
      <Paper sx={{ p: 3 }}>
        <WizardStepper steps={steps} />
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            The Semantics step is a placeholder; use the Semantics menu to create frames and senses.
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
