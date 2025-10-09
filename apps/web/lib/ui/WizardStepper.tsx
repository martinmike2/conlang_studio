"use client"
import * as React from 'react'
import { Box, Stepper, Step, StepLabel, Button } from '@mui/material'

interface WizardStepperProps {
  steps: string[]
  initial?: number
  onFinish?: () => void
}

export function WizardStepper({ steps, initial = 0, onFinish }: WizardStepperProps) {
  const [active, setActive] = React.useState(initial)

  const next = () => {
    if (active < steps.length - 1) setActive(a => a + 1)
    else if (onFinish) onFinish()
  }

  const back = () => setActive(a => Math.max(0, a - 1))

  return (
    <Box>
      <Stepper activeStep={active} alternativeLabel>
        {steps.map((s) => {
          return (
            <Step key={s}>
              <StepLabel>{s}</StepLabel>
            </Step>
          )
        })}
      </Stepper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button onClick={back} disabled={active === 0} variant="outlined">
          Back
        </Button>
        <Button onClick={next} variant="contained">
          {active === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Box>
    </Box>
  )
}

export default WizardStepper
