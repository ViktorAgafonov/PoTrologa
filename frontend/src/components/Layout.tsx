import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Box, Divider, Avatar, Menu, MenuItem, Tooltip,
} from '@mui/material'
import BuildIcon from '@mui/icons-material/Build'
import BackupIcon from '@mui/icons-material/Backup'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'
import { useAuth } from '../hooks/useAuth'

const DRAWER_WIDTH = 220

const menuItems = [
  { text: 'Средства измерения', icon: <BuildIcon />, path: '/', tooltip: 'Реестр всех СИ предприятия' },
  { text: 'Списание', icon: <DeleteSweepIcon />, path: '/writeoff', tooltip: 'Процедуры списания СИ' },
  { text: 'Шаблоны', icon: <DescriptionIcon />, path: '/templates', tooltip: 'Шаблоны актов списания' },
  { text: 'Бэкапы', icon: <BackupIcon />, path: '/backups', tooltip: 'Резервные копии БД' },
  { text: 'Настройки', icon: <SettingsIcon />, path: '/settings', tooltip: 'Пользователи, справочники, импорт' },
]

export default function Layout() {
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
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Помощник Метролога
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
        variant="permanent"
        sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
      >
        <Toolbar />
        <Divider />
        <List>
          {menuItems.map((item) => (
            <Tooltip key={item.path} title={item.tooltip} placement="right" arrow>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
