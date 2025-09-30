"use client"
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  CssBaseline,
  useMediaQuery,
  Theme,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { ThemeModeContext } from '../providers/ThemeModeContext'

const drawerWidth = 240

const navSections: { label: string; items: { label: string; href: string }[] }[] = [
  {
    label: 'Semantics',
    items: [
      { label: 'Frames', href: '/semantics/frames' },
      { label: 'Senses', href: '/semantics/senses' },
      { label: 'Idioms', href: '/semantics/idioms' },
    ],
  },
  {
    label: 'Morphology',
    items: [
      { label: 'Roots', href: '/morphology/roots' },
      { label: 'Root Pattern Builder', href: '/morphology/builder' },
      { label: 'Patterns', href: '/morphology/patterns' },
      { label: 'Bindings', href: '/morphology/bindings' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Validators', href: '/validators' },
      { label: 'Metrics', href: '/metrics' },
    ],
  },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'))
  const themeMode = React.useContext(ThemeModeContext)

  const toggleDrawer = () => setMobileOpen(o => !o)

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap>
          Conlang Studio
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 0 }}>
        <ListItemButton component={Link} href="/dashboard" selected={pathname === '/dashboard'}>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        {navSections.map(section => (
          <Box key={section.label} component="li" sx={{ listStyle: 'none', mt: 1 }}>
            <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary' }}>
              {section.label}
            </Typography>
            {section.items.map(item => {
              const selected = pathname?.startsWith(item.href)
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={!!selected}
                  sx={{ pl: 3 }}
                  onClick={() => setMobileOpen(false)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              )
            })}
          </Box>
        ))}
      </List>
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Phase 1 Shell
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flex: 1 }}>
            {computePageTitle(pathname)}
          </Typography>
          {themeMode && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <Tooltip title={`Switch to ${themeMode.mode === 'dark' ? 'light' : 'dark'} mode`}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={themeMode.mode === 'dark'}
                      onChange={() => themeMode.toggle()}
                      color="default"
                    />
                  }
                  label={themeMode.mode === 'dark' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                  sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { ml: .5 } }}
                />
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      {/* Desktop Drawer */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      )}
      {/* Mobile Drawer */}
      {!isDesktop && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
            onClose={toggleDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
        {children}
      </Box>
    </Box>
  )
}

function computePageTitle(pathname?: string | null) {
  if (!pathname) return 'Dashboard'
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard'
  const parts = pathname.split('/').filter(Boolean)
  return parts.map(capitalize).join(' / ')
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
