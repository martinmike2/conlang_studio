"use client"
import Link from 'next/link'
import { Box, Button, Card, CardActions, CardContent, Grid, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import LaunchIcon from '@mui/icons-material/Launch'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import StorageIcon from '@mui/icons-material/Storage'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import StyleIcon from '@mui/icons-material/Style'
import PolicyIcon from '@mui/icons-material/Policy'

export default function DashboardPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Stack spacing={1}>
        <Typography variant="h4">Welcome to Conlang Studio</Typography>
        <Typography variant="body1" color="text.secondary">
          Track your language data, run validators, and experiment with variant overlays from one workspace.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <CompareArrowsIcon color="primary" fontSize="large" />
                <Typography variant="h5">Variant Overlay Diff</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Quickly test phonological or morphological tweaks against an existing ruleset, resolve conflicts, then save reusable overlays to the database.
              </Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PlaylistAddCheckIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText primary="Paste base rules and candidate ops, then review conflicts inline." />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <StorageIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText primary="Save overlays to Postgres and reload them later." />
                </ListItem>
              </List>
            </CardContent>
            <CardActions sx={{ px: 3, pb: 3 }}>
              <Button
                component={Link}
                href="/overlays/diff"
                variant="contained"
                endIcon={<LaunchIcon />}
              >
                Open Overlay Diff
              </Button>
              <Button
                component={Link}
                href="/borrowing/wizard"
                variant="text"
                color="inherit"
              >
                Borrowing Wizard
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <StyleIcon color="secondary" fontSize="large" />
                <Typography variant="h5">Register &amp; Style Audit</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cross-check sample lexemes or illustrative sentences against curated style policies to maintain consistent register and tone across releases.
              </Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PolicyIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText primary="Review policy rules at a glance, including forbidden vocabulary and required traits." />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PlaylistAddCheckIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText primary="Run candidate samples, capture violations, and tweak tags/register to resolve issues." />
                </ListItem>
              </List>
            </CardContent>
            <CardActions sx={{ px: 3, pb: 3 }}>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                endIcon={<LaunchIcon />}
              >
                Open Register Audit
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Getting started
              </Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemText
                    primary="Run migrations and start the dev server"
                    secondary="pnpm migrate:migrate • pnpm --filter web dev"
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary="Prefer a quick smoke test?"
                    secondary="pnpm --filter testkits run e2e"
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary="Docs"
                    secondary="See docs/overlay_local_dev.md for database setup tips"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
