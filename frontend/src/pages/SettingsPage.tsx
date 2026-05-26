import { useEffect, useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, IconButton, Alert,
  Stepper, Step, StepLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { userApi, referenceApi, importApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

// Системные поля для маппинга импорта
const SYSTEM_FIELDS = [
  { key: 'name', label: 'Название' },
  { key: 'model', label: 'Модель' },
  { key: 'serialNumber', label: 'Серийный номер' },
  { key: 'inventoryNumber', label: 'Инвентарный номер' },
  { key: 'manufacturer', label: 'Производитель' },
  { key: 'status', label: 'Статус' },
  { key: 'verificationIntervalMonths', label: 'Интервал поверки (мес.)' },
  { key: 'startDate', label: 'Дата ввода в эксплуатацию' },
]

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
  const [newOrg, setNewOrg] = useState({ workshop: '', section: '' })

  // Импорт
  const [importStep, setImportStep] = useState(0)
  const [importId, setImportId] = useState('')
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importMapping, setImportMapping] = useState<Record<string, string>>({})
  const [importPreview, setImportPreview] = useState<any>(null)
  const [importResult, setImportResult] = useState<any>(null)

  const [error, setError] = useState('')

  const loadAll = () => {
    if (user?.role === 'ADMIN') {
      userApi.getAll().then((res) => setUsers(res.data || []))
    }
    referenceApi.getTypes().then((res) => setTypes(res.data || []))
    referenceApi.getOrganizations().then((res) => setOrgs(res.data || []))
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
    setNewOrg({ workshop: '', section: '' })
    loadAll()
  }

  // Импорт — загрузка файла
  const handleImportUpload = async (file: File) => {
    try {
      setError('')
      const res = await importApi.upload(file)
      setImportId(res.importId || res.data?.importId)
      setImportHeaders(res.headers || res.data?.headers || [])
      setImportStep(1)
    } catch (e: any) { setError(e.message) }
  }

  // Импорт — отправка маппинга и получение превью
  const handleImportMapping = async () => {
    try {
      setError('')
      await importApi.updateMapping(importId, importMapping)
      const res = await importApi.preview(importId)
      setImportPreview(res.data || res)
      setImportStep(2)
    } catch (e: any) { setError(e.message) }
  }

  // Импорт — коммит
  const handleImportCommit = async () => {
    try {
      setError('')
      const res = await importApi.commit(importId)
      setImportResult(res.data || res)
      setImportStep(3)
    } catch (e: any) { setError(e.message) }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Настройки</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Пользователи" disabled={user?.role !== 'ADMIN'} />
        <Tab label="Типы СИ" />
        <Tab label="Участки" />
        <Tab label="Импорт" />
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
                  <TableRow><TableCell colSpan={3} align="center">Нет типов</TableCell></TableRow>
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
                  <TableCell>Цех</TableCell>
                  <TableCell>Участок</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orgs.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.workshop}</TableCell>
                    <TableCell>{o.section || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={async () => {
                        if (!confirm(`Удалить участок «${o.workshop}»?`)) return
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

      {/* --- Импорт --- */}
      {tab === 3 && (
        <Box>
          <Stepper activeStep={importStep} sx={{ mb: 3 }}>
            <Step><StepLabel>Загрузка файла</StepLabel></Step>
            <Step><StepLabel>Маппинг колонок</StepLabel></Step>
            <Step><StepLabel>Предпросмотр</StepLabel></Step>
            <Step><StepLabel>Результат</StepLabel></Step>
          </Stepper>

          {importStep === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Button variant="contained" startIcon={<UploadFileIcon />} component="label">
                Выбрать XLSX-файл
                <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportUpload(f)
                }} />
              </Button>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Поддерживаются файлы .xlsx и .xls
              </Typography>
            </Box>
          )}

          {importStep === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Сопоставьте колонки файла с полями системы:</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Колонка файла</TableCell>
                    <TableCell>Поле системы</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importHeaders.map((h) => (
                    <TableRow key={h}>
                      <TableCell>{h}</TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select value={importMapping[h] || ''} onChange={(e) => setImportMapping({ ...importMapping, [h]: e.target.value })}>
                            <MenuItem value="">— пропустить —</MenuItem>
                            {SYSTEM_FIELDS.map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={() => setImportStep(0)}>Назад</Button>
                <Button variant="contained" onClick={handleImportMapping}>Далее</Button>
              </Box>
            </Box>
          )}

          {importStep === 2 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Предпросмотр: {importPreview?.newCount ?? 0} новых, {importPreview?.conflictCount ?? 0} конфликтов
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={() => setImportStep(1)}>Назад</Button>
                <Button variant="contained" color="success" onClick={handleImportCommit}>Импортировать</Button>
              </Box>
            </Box>
          )}

          {importStep === 3 && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Импорт завершён. Создано: {importResult?.created ?? 0}, обновлено: {importResult?.updated ?? 0}, ошибок: {importResult?.errors ?? 0}
              </Alert>
              <Button variant="outlined" onClick={() => { setImportStep(0); setImportId(''); setImportHeaders([]); setImportMapping({}); setImportPreview(null); setImportResult(null) }}>
                Новый импорт
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
