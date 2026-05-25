import { useEffect, useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, IconButton, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { userApi, referenceApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(0)

  // Пользователи
  const [users, setUsers] = useState<any[]>([])
  const [userDlg, setUserDlg] = useState(false)
  const [newUser, setNewUser] = useState({ login: '', password: '', role: 'VIEWER', email: '' })

  // Типы СИ
  const [types, setTypes] = useState<any[]>([])
  const [typeDlg, setTypeDlg] = useState(false)
  const [newType, setNewType] = useState({ name: '', description: '' })

  // Участки
  const [orgs, setOrgs] = useState<any[]>([])
  const [orgDlg, setOrgDlg] = useState(false)
  const [newOrg, setNewOrg] = useState({ factory: '', workshop: '', section: '' })

  // Ответственные
  const [resps, setResps] = useState<any[]>([])
  const [respDlg, setRespDlg] = useState(false)
  const [newResp, setNewResp] = useState({ fullName: '', position: '' })

  const [error, setError] = useState('')

  const loadAll = () => {
    if (user?.role === 'ADMIN') {
      userApi.getAll().then((res) => setUsers(res.data || []))
    }
    referenceApi.getTypes().then((res) => setTypes(res.data || []))
    referenceApi.getOrganizations().then((res) => setOrgs(res.data || []))
    referenceApi.getResponsibles().then((res) => setResps(res.data || []))
  }

  useEffect(() => { loadAll() }, [user])

  const handleCreateUser = async () => {
    await userApi.create(newUser)
    setUserDlg(false)
    setNewUser({ login: '', password: '', role: 'VIEWER', email: '' })
    loadAll()
  }

  const handleCreateType = async () => {
    await referenceApi.createType(newType)
    setTypeDlg(false)
    setNewType({ name: '', description: '' })
    loadAll()
  }

  const handleCreateOrg = async () => {
    await referenceApi.createOrganization(newOrg)
    setOrgDlg(false)
    setNewOrg({ factory: '', workshop: '', section: '' })
    loadAll()
  }

  const handleCreateResp = async () => {
    await referenceApi.createResponsible(newResp)
    setRespDlg(false)
    setNewResp({ fullName: '', position: '' })
    loadAll()
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Настройки</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Пользователи" disabled={user?.role !== 'ADMIN'} />
        <Tab label="Типы СИ" />
        <Tab label="Участки" />
        <Tab label="Ответственные" />
      </Tabs>

      {/* --- Пользователи --- */}
      {tab === 0 && user?.role === 'ADMIN' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUserDlg(true)}>Добавить пользователя</Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Логин</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Активен</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.login}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell>{u.isActive ? 'Да' : 'Нет'}</TableCell>
                    <TableCell>
                      {u.login !== 'admin' && u.id !== user?.id && (
                        <IconButton size="small" color="error" onClick={async () => {
                          if (!confirm(`Удалить пользователя «${u.login}»?`)) return
                          try { setError(''); await userApi.remove(u.id); loadAll() }
                          catch (e: any) { setError(e.message) }
                        }}><DeleteIcon fontSize="small" /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Dialog open={userDlg} onClose={() => setUserDlg(false)}>
            <DialogTitle>Новый пользователь</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField label="Логин" fullWidth margin="dense"
                value={newUser.login} onChange={(e) => setNewUser({ ...newUser, login: e.target.value })} />
              <TextField label="Пароль" type="password" fullWidth margin="dense"
                value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <FormControl fullWidth margin="dense">
                <InputLabel>Роль</InputLabel>
                <Select value={newUser.role} label="Роль" onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <MenuItem value="ADMIN">Администратор</MenuItem>
                  <MenuItem value="METROLOGIST">Метролог</MenuItem>
                  <MenuItem value="VIEWER">Просмотр</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Email" fullWidth margin="dense"
                value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUserDlg(false)}>Отмена</Button>
              <Button variant="contained" onClick={handleCreateUser}>Создать</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* --- Типы СИ --- */}
      {tab === 1 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTypeDlg(true)}>Добавить тип</Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {types.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.description || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={async () => {
                        if (!confirm(`Удалить тип «${t.name}»?`)) return
                        try { setError(''); await referenceApi.deleteType(t.id); loadAll() }
                        catch (e: any) { setError(e.message) }
                      }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && (
                  <TableRow><TableCell colSpan={2} align="center">Нет типов</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
          <Dialog open={typeDlg} onClose={() => setTypeDlg(false)}>
            <DialogTitle>Новый тип СИ</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField label="Название" fullWidth margin="dense"
                value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} />
              <TextField label="Описание" fullWidth margin="dense"
                value={newType.description} onChange={(e) => setNewType({ ...newType, description: e.target.value })} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTypeDlg(false)}>Отмена</Button>
              <Button variant="contained" onClick={handleCreateType}>Создать</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* --- Участки --- */}
      {tab === 2 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOrgDlg(true)}>Добавить участок</Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Завод</TableCell>
                  <TableCell>Цех</TableCell>
                  <TableCell>Участок</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orgs.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.factory}</TableCell>
                    <TableCell>{o.workshop || '—'}</TableCell>
                    <TableCell>{o.section || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={async () => {
                        if (!confirm(`Удалить участок «${o.factory}»?`)) return
                        try { setError(''); await referenceApi.deleteOrganization(o.id); loadAll() }
                        catch (e: any) { setError(e.message) }
                      }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {orgs.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center">Нет участков</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
          <Dialog open={orgDlg} onClose={() => setOrgDlg(false)}>
            <DialogTitle>Новый участок</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField label="Завод" fullWidth margin="dense"
                value={newOrg.factory} onChange={(e) => setNewOrg({ ...newOrg, factory: e.target.value })} />
              <TextField label="Цех" fullWidth margin="dense"
                value={newOrg.workshop} onChange={(e) => setNewOrg({ ...newOrg, workshop: e.target.value })} />
              <TextField label="Участок" fullWidth margin="dense"
                value={newOrg.section} onChange={(e) => setNewOrg({ ...newOrg, section: e.target.value })} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOrgDlg(false)}>Отмена</Button>
              <Button variant="contained" onClick={handleCreateOrg}>Создать</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* --- Ответственные лица --- */}
      {tab === 3 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRespDlg(true)}>Добавить ответственного</Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ФИО</TableCell>
                  <TableCell>Должность</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resps.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell>{r.position || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={async () => {
                        if (!confirm(`Удалить ответственного «${r.fullName}»?`)) return
                        try { setError(''); await referenceApi.deleteResponsible(r.id); loadAll() }
                        catch (e: any) { setError(e.message) }
                      }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {resps.length === 0 && (
                  <TableRow><TableCell colSpan={2} align="center">Нет ответственных</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
          <Dialog open={respDlg} onClose={() => setRespDlg(false)}>
            <DialogTitle>Новый ответственный</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField label="ФИО" fullWidth margin="dense"
                value={newResp.fullName} onChange={(e) => setNewResp({ ...newResp, fullName: e.target.value })} />
              <TextField label="Должность" fullWidth margin="dense"
                value={newResp.position} onChange={(e) => setNewResp({ ...newResp, position: e.target.value })} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRespDlg(false)}>Отмена</Button>
              <Button variant="contained" onClick={handleCreateResp}>Создать</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}
