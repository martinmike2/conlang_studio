"use client"
import { Suspense } from 'react'
import { Skeleton } from '@mui/material'
import MetricsDashboard from '../../lib/ui/MetricsDashboard'

export const dynamic = 'force-dynamic'

export default function MetricsPage() {
  return (
    <Suspense fallback={<Skeleton variant="rectangular" height={320} />}>
      <MetricsDashboard />
    </Suspense>
  )
}
