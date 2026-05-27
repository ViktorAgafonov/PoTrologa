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
import { userApi, referenceApi, importApi, settingsApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

// Системные поля для маппинга импорта
const SYSTEM_FIELDS = [
  { key: 'name', label: 'Наименование СИ' },
  { key: 'model', label: 'Тип, заводское обозначение' },
  { key: 'manufacturer', label: 'Изготовитель' },
  { key: 'serialNumber', label: 'Заводской номер' },
  { key: 'inventoryNumber', label: 'Инвентарный номер' },
  { key: 'productionYear', label: 'Год выпуска' },
  { key: 'verificationIntervalMonths', label: 'Периодичность поверки (месяцы)' },
  { key: 'lastVerificationDate', label: 'Дата последней поверки' },
  { key: 'organization', label: 'Участок' },
]

const VISIBLE_COLUMNS = 8

function excelDateToJSDate(serial: number): string {
  const date = new Date((serial - 25569) * 86400 * 1000)
  return date.toISOString().split('T')[0]
}

function formatExcelCell(value: any): string {
  if (value == null) return ''
  if (typeof value === 'number' && value > 30000 && value < 60000) {
    return excelDateToJSDate(value)
  }
  if (typeof value === 'string' && /^\d{5,6}$/.test(value)) {
    const n = parseInt(value, 10)
    if (n > 30000 && n < 60000) return excelDateToJSDate(n)
  }
  return String(value)
}

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
  const [importRawRows, setImportRawRows] = useState<any[][]>([])
  const [importHeaderRow, setImportHeaderRow] = useState<number>(0)
  const [columnOffset, setColumnOffset] = useState(0)

  // Конструктор номера списания
  const [woTemplate, setWoTemplate] = useState('')
  const [woTags, setWoTags] = useState<{ tag: string; label: string }[]>([])
  const [woPreview, setWoPreview] = useState('')

  const [error, setError] = useState('')

  const loadAll = () => {
    if (user?.role === 'ADMIN') {
      userApi.getAll().then((res) => setUsers(res.data || []))
    }
    referenceApi.getTypes().then((res) => setTypes(res.data || []))
    referenceApi.getOrganizations().then((res) => setOrgs(res.data || []))
  }

  useEffect(() => { loadAll() }, [user])

  useEffect(() => {
    settingsApi.getWriteoffTemplate().then((res) => {
      setWoTemplate(res.data?.template || res.template || '')
      setWoTags(res.data?.tags || res.tags || [])
    })
  }, [])

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
      const id = res.import_id || res.importId || res.data?.import_id || res.data?.importId
      const headers = res.headers || res.data?.headers || []
      const mapping = res.mapping || res.data?.mapping || {}
      const rawRows = res.raw_rows || res.data?.raw_rows || []
      const headerRow = res.header_row ?? res.data?.header_row ?? 0
      setImportId(id)
      setImportHeaders(headers)
      setImportMapping(mapping)
      setImportRawRows(rawRows)
      setImportHeaderRow(headerRow)
      setColumnOffset(0)
      setImportStep(1)
    } catch (e: any) { setError(e.message) }
  }

  // Импорт — отправка маппинга и получение превью
  const handleImportMapping = async () => {
    try {
      setError('')
      await importApi.updateMapping(importId, importMapping, importHeaderRow)
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
        <Tab label="Номера списания" />
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
              <FormControl size="small" sx={{ mb: 2, minWidth: 200 }}>
                <InputLabel>Строка заголовков</InputLabel>
                <Select value={importHeaderRow} onChange={(e) => {
                  const row = Number(e.target.value)
                  setImportHeaderRow(row)
                  const newHeaders = (importRawRows[row] || []).map((h: any) => String(h ?? '').trim()).filter((h: string) => h !== '' && !h.startsWith('__EMPTY'))
                  setImportHeaders(newHeaders)
                  setImportMapping({})
                }}>
                  {importRawRows.map((_, i) => (
                    <MenuItem key={i} value={i}>Строка {i + 1}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Button
                  size="small"
                  disabled={columnOffset === 0}
                  onClick={() => setColumnOffset(v => Math.max(0, v - VISIBLE_COLUMNS))}
                >
                  ←
                </Button>
                <Typography variant="body2">
                  Колонки {columnOffset + 1}–{Math.min(columnOffset + VISIBLE_COLUMNS, importRawRows[0]?.length || 0)} из {importRawRows[0]?.length || 0}
                </Typography>
                <Button
                  size="small"
                  disabled={columnOffset + VISIBLE_COLUMNS >= (importRawRows[0]?.length || 0)}
                  onClick={() => setColumnOffset(v => v + VISIBLE_COLUMNS)}
                >
                  →
                </Button>
              </Box>

              <Paper sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                <Table size="small">
                  <TableBody>
                    {importRawRows.map((row, i) => (
                      <TableRow key={i} sx={{ bgcolor: i === importHeaderRow ? 'primary.50' : 'inherit' }}>
                        <TableCell width={40}>{i + 1}</TableCell>
                        {row.slice(columnOffset, columnOffset + VISIBLE_COLUMNS).map((cell, j) => (
                          <TableCell key={j} sx={{ whiteSpace: 'nowrap', minWidth: 150 }}>
                            {formatExcelCell(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

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
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)' }}>
              <Typography variant="subtitle1" gutterBottom>
                Предпросмотр: {(importPreview?.new_records ?? importPreview?.newRecords?.length ?? 0)} новых, {(importPreview?.conflicts?.length ?? importPreview?.conflictCount ?? 0)} конфликтов
              </Typography>
              {importPreview?.newRecords?.length > 0 && (
                <Paper sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                  <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Название</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Инв.№</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Серийный №</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Год выпуска</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Модель</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Изготовитель</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Дата поверки</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>След. поверка</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importPreview.newRecords.slice(0, 10).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.name}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.inventoryNumber}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.serialNumber}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.productionYear || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.model || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.manufacturer || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.lastVerificationDate || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.nextVerificationDate || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
              <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
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
              <Button variant="outlined" onClick={() => { setImportStep(0); setImportId(''); setImportHeaders([]); setImportMapping({}); setImportPreview(null); setImportResult(null); setImportRawRows([]); setImportHeaderRow(0) }}>
                Новый импорт
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* --- Номера списания --- */}
      {tab === 4 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>Шаблон номера процедуры списания</Typography>
          <TextField
            fullWidth
            margin="dense"
            label="Шаблон"
            value={woTemplate}
            onChange={(e) => setWoTemplate(e.target.value)}
            helperText="Используйте теги ниже. Остальной текст вставляется как есть."
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
            {woTags.map((t) => (
              <Button key={t.tag} size="small" variant="outlined" onClick={() => setWoTemplate((prev) => prev + t.tag)}>
                {t.label} <code style={{ marginLeft: 4 }}>{t.tag}</code>
              </Button>
            ))}
          </Box>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="textSecondary">Пример номера сейчас:</Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
              {woTemplate
                .replace(/\{YYYY\}/g, new Date().getFullYear().toString())
                .replace(/\{YY\}/g, String(new Date().getFullYear()).slice(2))
                .replace(/\{MM\}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                .replace(/\{DD\}/g, String(new Date().getDate()).padStart(2, '0'))
                .replace(/\{HH\}/g, String(new Date().getHours()).padStart(2, '0'))
                .replace(/\{mm\}/g, String(new Date().getMinutes()).padStart(2, '0'))
                .replace(/\{Q\}/g, String(Math.floor(new Date().getMonth() / 3) + 1))
                .replace(/\{WW\}/g, '21')
                .replace(/\{D\}/g, '1').replace(/\{W\}/g, '1').replace(/\{M\}/g, '1').replace(/\{Qn\}/g, '1').replace(/\{Y\}/g, '1')
              }
            </Typography>
          </Paper>
          <Button variant="contained" onClick={async () => {
            try {
              setError('')
              await settingsApi.setWriteoffTemplate(woTemplate)
              setWoPreview('Сохранено')
            } catch (e: any) { setError(e.message) }
          }}>Сохранить шаблон</Button>
          {woPreview && <Alert severity="success" sx={{ mt: 1, display: 'inline-flex' }}>{woPreview}</Alert>}
        </Box>
      )}
    </Box>
  )
}
