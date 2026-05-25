import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Box, Divider, Avatar, Menu, MenuItem,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BuildIcon from '@mui/icons-material/Build'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import BackupIcon from '@mui/icons-material/Backup'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'
import { useAuth } from '../hooks/useAuth'

const DRAWER_WIDTH = 240

const menuItems = [
  { text: 'Дашборд', icon: <DashboardIcon />, path: '/' },
  { text: 'Средства измерения', icon: <BuildIcon />, path: '/instruments' },
  { text: 'Импорт', icon: <UploadFileIcon />, path: '/import' },
  { text: 'Списание', icon: <DeleteSweepIcon />, path: '/writeoff' },
  { text: 'Шаблоны', icon: <DescriptionIcon />, path: '/templates' },
  { text: 'Бэкапы', icon: <BackupIcon />, path: '/backups' },
  { text: 'Настройки', icon: <SettingsIcon />, path: '/settings' },
]

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    setAnchorEl(null)
    await logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            ПоТролога
          </Typography>
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32 }}>{user?.login?.[0]?.toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>{user?.login} ({user?.role})</MenuItem>
            <MenuItem onClick={handleLogout}>Выйти</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{ width: DRAWER_WIDTH, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
      >
        <Toolbar />
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: drawerOpen ? `${DRAWER_WIDTH}px` : 0, transition: 'margin 0.2s' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
