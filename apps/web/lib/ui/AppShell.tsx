"use client"
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
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
  FormControlLabel,
  Collapse,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Button
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ThemeModeContext } from '../providers/ThemeModeContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useActiveLanguage } from '../providers/ActiveLanguageProvider'

const drawerWidth = 240
const PROJECT_NAME = 'Conlang Studio'

interface NavItem {
  label: string
  href: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Rule Graph',
    items: [
      { label: 'Rule Dependency Graph', href: '/languages/rule-graph' }
    ]
  },
  {
    label: 'Workspace',
    items: [{ label: 'Dashboard', href: '/dashboard' }]
  },
  {
    label: 'Wizards',
    items: [
      { label: 'Language Setup', href: '/wizard' },
      { label: 'Borrowing Wizard', href: '/borrowing/wizard' }
    ]
  },
  {
    label: 'Semantics',
    items: [
      { label: 'Frames', href: '/semantics/frames' },
      { label: 'Senses', href: '/semantics/senses' },
      { label: 'Idioms', href: '/semantics/idioms' }
    ]
  },
  {
    label: 'Morphology',
    items: [
      { label: 'Roots', href: '/morphology/roots' },
      { label: 'Root Pattern Builder', href: '/morphology/builder' },
      { label: 'Patterns', href: '/morphology/patterns' },
      { label: 'Bindings', href: '/morphology/bindings' }
    ]
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Validators', href: '/validators' },
      { label: 'Metrics', href: '/metrics' }
    ]
  },
  {
    label: 'Diachrony',
    items: [
      { label: 'Evolution Timeline', href: '/diachrony/timeline' }
    ]
  },
  {
    label: 'Variant & Style',
    items: [
      { label: 'Overlay Diff', href: '/overlays/diff' },
      { label: 'Register Audit', href: '/register' }
    ]
  },
  {
    label: 'Account',
    items: [{ label: 'Languages', href: '/languages' }]
  }
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'))
  const themeMode = React.useContext(ThemeModeContext)
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeLanguage } = useActiveLanguage()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() => new Set(navSections.map(section => section.label)))
  const authRoutes = React.useMemo(() => new Set(['/signin', '/signup']), [])
  const isAuthRoute = pathname ? authRoutes.has(pathname) : false

  const toggleDrawer = () => setMobileOpen(o => !o)

  const closeMobileDrawer = () => setMobileOpen(false)

  const handleToggleSection = React.useCallback((label: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  React.useEffect(() => {
    if (!pathname) return
    const activeSection = navSections.find(section => section.items.some(item => pathname.startsWith(item.href)))
    if (activeSection && !expandedSections.has(activeSection.label)) {
      setExpandedSections(prev => new Set(prev).add(activeSection.label))
    }
  }, [pathname, expandedSections])

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)
  const handleSignOut = async () => {
    handleMenuClose()
    await signOut({ callbackUrl: '/signin' })
  }

  const userInitials = React.useMemo(() => {
    const base = session?.user?.name || session?.user?.email || ''
    if (!base) return 'U'
    const segments = base.split(/[\s@.]+/).filter(Boolean)
    const [first = 'U', second] = segments
    return (first[0] + (second?.[0] ?? '')).toUpperCase()
  }, [session])

  const requiresLanguage = status === 'authenticated' && !activeLanguage && pathname !== '/languages'

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {status === 'authenticated' && (
        <Box sx={{ px: 2, pt: { xs: 2, sm: 3 }, pb: 2 }}>
          <LanguageSwitcher onSelect={closeMobileDrawer} />
        </Box>
      )}
      <Divider />
      <List sx={{ flex: 1, py: 0 }}>
        {navSections.map(section => (
          <Box key={section.label} component="li" sx={{ listStyle: 'none' }}>
            <ListItemButton onClick={() => handleToggleSection(section.label)} sx={{ pr: 2 }}>
              <ListItemText primary={section.label} primaryTypographyProps={{ variant: 'subtitle2' }} />
              {expandedSections.has(section.label) ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </ListItemButton>
            <Collapse in={expandedSections.has(section.label)} unmountOnExit>
              <List disablePadding>
                {section.items.map(item => {
                  const selected = pathname?.startsWith(item.href)
                  return (
                    <ListItemButton
                      key={item.href}
                      component={Link}
                      href={item.href}
                      selected={!!selected}
                      sx={{ pl: 4 }}
                      onClick={closeMobileDrawer}
                    >
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  )
                })}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Workspace preview build
        </Typography>
      </Box>
    </Box>
  )

  if (isAuthRoute) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3 }}>
        <CssBaseline />
        {children}
      </Box>
    )
  }

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {PROJECT_NAME}
            </Typography>
            <Box
              sx={{
                width: 1,
                height: 24,
                bgcolor: 'divider',
                opacity: 0.5,
                borderRadius: 1,
                display: { xs: 'none', sm: 'block' }
              }}
            />
            <Typography
              variant="subtitle1"
              noWrap
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                flexShrink: 1,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              {computePageTitle(pathname)}
            </Typography>
          </Box>
          {status === 'authenticated' && (
            activeLanguage ? (
              <Chip label={activeLanguage.name} color="primary" size="small" sx={{ mr: 2 }} />
            ) : (
              <Tooltip title="Select or create a language to unlock workspace tools">
                <Chip label="No language selected" variant="outlined" size="small" sx={{ mr: 2 }} />
              </Tooltip>
            )
          )}
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
          {status === 'authenticated' ? (
            <>
              <Tooltip title={session?.user?.email ?? 'Account'}>
                <IconButton color="inherit" onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {userInitials}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {session?.user?.email && (
                  <MenuItem disabled sx={{ opacity: 1 }}>
                    {session.user.email}
                  </MenuItem>
                )}
                <MenuItem onClick={() => { handleMenuClose(); router.push('/languages') }}>
                  Manage languages
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => router.push('/signin')} sx={{ ml: 1 }}>
              Sign in
            </Button>
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
            '& .MuiDrawer-paper': (theme) => ({
              width: drawerWidth,
              boxSizing: 'border-box',
              top: theme.spacing(7),
              height: `calc(100% - ${theme.spacing(7)})`,
              borderRight: `1px solid ${theme.palette.divider}`,
              [theme.breakpoints.up('sm')]: {
                top: theme.spacing(8),
                height: `calc(100% - ${theme.spacing(8)})`
              }
            })
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
            '& .MuiDrawer-paper': (theme) => ({
              width: drawerWidth,
              boxSizing: 'border-box',
              top: theme.spacing(7),
              height: `calc(100% - ${theme.spacing(7)})`,
              [theme.breakpoints.up('sm')]: {
                top: theme.spacing(8),
                height: `calc(100% - ${theme.spacing(8)})`
              }
            })
          }}
        >
          {drawer}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
        {requiresLanguage ? (
          <Box sx={{ maxWidth: 440, mx: 'auto', mt: 8, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Choose a language to continue
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              The workspace customizes every tool to a specific language. Select an existing language or create a new one to get started.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/languages')}>
              Manage languages
            </Button>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Box>
  )
}

function computePageTitle(pathname?: string | null) {
  if (!pathname) return 'Dashboard'
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard'
  const parts = pathname.split('/').filter(Boolean)
  return parts.map(segment => pageTitleOverrides[segment] ?? capitalize(segment)).join(' / ')
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const pageTitleOverrides: Record<string, string> = {
  overlays: 'Variant Overlays',
  diff: 'Diff',
  register: 'Register & Style'
}
