import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Grid, TextField, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, FormControlLabel, Checkbox,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { instrumentApi, referenceApi, documentApi, auditApi } from '../services/api'

const emptyForm = {
  name: '', model: '', serialNumber: '', manufacturer: '',
  inventoryNumber: '', verificationIntervalMonths: '',
  typeId: '', organizationId: '', responsibleId: '', startDate: '',
}

export default function InstrumentCardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Record<string, string>>(emptyForm)
  const [tab, setTab] = useState(0)
  const [verifications, setVerifications] = useState<any[]>([])
  const [repairs, setRepairs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Справочники для выпадающих списков
  const [types, setTypes] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [responsibles, setResponsibles] = useState<any[]>([])
  // Документы
  const [documents, setDocuments] = useState<any[]>([])
  // История (AuditLog)
  const [history, setHistory] = useState<any[]>([])
  // Диалоги добавления поверки/ремонта
  const [verDlg, setVerDlg] = useState(false)
  const [verForm, setVerForm] = useState({ verificationDate: '', result: 'PASSED', organization: '', nextVerificationDate: '' })
  const [repDlg, setRepDlg] = useState(false)
  const [repForm, setRepForm] = useState({ sendDate: '', organization: '', description: '' })
  // Предложение списания при FAILED
  const [showWriteoffHint, setShowWriteoffHint] = useState(false)
  // Автогенерация инв. номера
  const [autoInvNumber, setAutoInvNumber] = useState(true)

  const isNew = id === 'new'

  // Загрузка документов и истории при смене вкладки
  useEffect(() => {
    if (isNew || !id) return
    if (tab === 3) {
      instrumentApi.getById(Number(id)).then((res) => setDocuments(res.data?.documents || []))
    }
    if (tab === 4) {
      auditApi.getByEntity('instrument', Number(id)).then((res) => setHistory(res.data || []))
    }
  }, [tab, id])

  // Загрузка справочников
  useEffect(() => {
    referenceApi.getTypes().then((res) => setTypes(res.data || []))
    referenceApi.getOrganizations().then((res) => setOrganizations(res.data || []))
    referenceApi.getResponsibles().then((res) => setResponsibles(res.data || []))
  }, [])

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true)
      instrumentApi.getById(Number(id)).then((res) => {
        const d = res.data
        setForm({
          name: d.name || '',
          model: d.model || '',
          serialNumber: d.serialNumber || '',
          manufacturer: d.manufacturer || '',
          inventoryNumber: d.inventoryNumber || '',
          verificationIntervalMonths: String(d.verificationIntervalMonths || ''),
          typeId: String(d.typeId || ''),
          organizationId: String(d.organizationId || ''),
          responsibleId: String(d.responsibleId || ''),
        })
        setLoading(false)
      })
      instrumentApi.getVerifications(Number(id)).then((res) => setVerifications(res.data || []))
      instrumentApi.getRepairs(Number(id)).then((res) => setRepairs(res.data || []))
    }
  }, [id])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value })
  }

  const handleSelect = (field: string) => (e: SelectChangeEvent) => {
    setForm({ ...form, [field]: e.target.value })
  }

  const handleSave = async () => {
    setError('')
    try {
      const payload: any = {
        name: form.name,
        model: form.model,
        serialNumber: form.serialNumber,
        manufacturer: form.manufacturer,
        startDate: form.startDate || null,
        verificationIntervalMonths: form.verificationIntervalMonths ? Number(form.verificationIntervalMonths) : null,
        typeId: form.typeId ? Number(form.typeId) : null,
        organizationId: form.organizationId ? Number(form.organizationId) : null,
        responsibleId: form.responsibleId ? Number(form.responsibleId) : null,
      }
      if (isNew) {
        if (!autoInvNumber && form.inventoryNumber) payload.inventoryNumber = form.inventoryNumber
        await instrumentApi.create(payload)
        navigate('/instruments', { replace: true })
      } else {
        await instrumentApi.update(Number(id), payload)
        navigate('/instruments', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    }
  }

  if (!isNew && loading) return <Typography>Загрузка...</Typography>

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/instruments')} sx={{ mb: 2 }}>
        Назад
      </Button>
      <Typography variant="h5" gutterBottom>
        {isNew ? 'Новое СИ' : `${form.name} (${form.inventoryNumber})`}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Общие" />
        <Tab label="Поверки" disabled={isNew} />
        <Tab label="Ремонты" disabled={isNew} />
        <Tab label="Документы" disabled={isNew} />
        <Tab label="История" disabled={isNew} />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Название" fullWidth value={form.name} onChange={handleChange('name')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Модель" fullWidth value={form.model} onChange={handleChange('model')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Серийный номер" fullWidth value={form.serialNumber} onChange={handleChange('serialNumber')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Производитель" fullWidth value={form.manufacturer} onChange={handleChange('manufacturer')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {isNew ? (
                  <Box>
                    <FormControlLabel
                      control={<Checkbox checked={autoInvNumber} onChange={(e) => setAutoInvNumber(e.target.checked)} />}
                      label="Новый инв. №  (автоприсвоение)"
                    />
                    {!autoInvNumber && (
                      <TextField
                        label="Инвентарный номер"
                        fullWidth
                        value={form.inventoryNumber}
                        onChange={handleChange('inventoryNumber')}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                ) : (
                  <TextField label="Инвентарный номер" fullWidth value={form.inventoryNumber} disabled />
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Тип СИ</InputLabel>
                  <Select value={form.typeId} label="Тип СИ" onChange={handleSelect('typeId')}>
                    <MenuItem value="">— не выбран —</MenuItem>
                    {types.map((t: any) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Участок</InputLabel>
                  <Select value={form.organizationId} label="Участок" onChange={handleSelect('organizationId')}>
                    <MenuItem value="">— не выбран —</MenuItem>
                    {organizations.map((o: any) => <MenuItem key={o.id} value={String(o.id)}>{[o.factory, o.workshop, o.section].filter(Boolean).join(' → ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Ответственный</InputLabel>
                  <Select value={form.responsibleId} label="Ответственный" onChange={handleSelect('responsibleId')}>
                    <MenuItem value="">— не выбран —</MenuItem>
                    {responsibles.map((r: any) => <MenuItem key={r.id} value={String(r.id)}>{r.fullName ? `${r.fullName} (${r.position})` : r.position}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Дата ввода в эксплуатацию"
                  type="date"
                  fullWidth
                  value={form.startDate}
                  onChange={handleChange('startDate')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Интервал поверки (мес.)"
                  type="number"
                  fullWidth
                  value={form.verificationIntervalMonths}
                  onChange={handleChange('verificationIntervalMonths')}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {!isNew && (
                <Button variant="outlined" onClick={() =>
                  window.open(`https://fgis.gost.ru/fundmetrology/cm/results?filter=di.mitnumber%3D${encodeURIComponent(form.serialNumber || form.inventoryNumber)}`, '_blank')
                }>
                  Проверить в АРШИН
                </Button>
              )}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                {isNew ? 'Добавить' : 'Сохранить'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* --- Поверки --- */}
      {tab === 1 && (
        <>
          {showWriteoffHint && (
            <Alert severity="warning" sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" onClick={() => navigate('/writeoff')}>Перейти к списанию</Button>
            }>
              Поверка не пройдена. Рекомендуется оформить списание СИ.
            </Alert>
          )}
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setVerDlg(true)}>Добавить поверку</Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Результат</TableCell>
                <TableCell>Организация</TableCell>
                <TableCell>Следующая</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verifications.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>{v.verificationDate}</TableCell>
                  <TableCell>
                    <Chip label={v.result === 'PASSED' ? 'Пройдена' : 'Не пройдена'} size="small" color={v.result === 'PASSED' ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell>{v.organization}</TableCell>
                  <TableCell>{v.nextVerificationDate || '—'}</TableCell>
                </TableRow>
              ))}
              {verifications.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">Нет записей</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <Dialog open={verDlg} onClose={() => setVerDlg(false)}>
            <DialogTitle>Добавить поверку</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField label="Дата поверки" type="date" fullWidth margin="dense" slotProps={{ inputLabel: { shrink: true } }}
                value={verForm.verificationDate} onChange={(e) => setVerForm({ ...verForm, verificationDate: e.target.value })} />
              <FormControl fullWidth margin="dense">
                <InputLabel>Результат</InputLabel>
                <Select value={verForm.result} label="Результат" onChange={(e) => setVerForm({ ...verForm, result: e.target.value })}>
                  <MenuItem value="PASSED">Пройдена</MenuItem>
                  <MenuItem value="FAILED">Не пройдена</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Организация" fullWidth margin="dense"
                value={verForm.organization} onChange={(e) => setVerForm({ ...verForm, organization: e.target.value })} />
              <TextField label="Следующая поверка" type="date" fullWidth margin="dense" slotProps={{ inputLabel: { shrink: true } }}
                value={verForm.nextVerificationDate} onChange={(e) => setVerForm({ ...verForm, nextVerificationDate: e.target.value })} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setVerDlg(false)}>Отмена</Button>
              <Button variant="contained" onClick={async () => {
                await instrumentApi.addVerification(Number(id), verForm)
                setVerDlg(false)
                // Проверить FAILED → предложить списание
                if (verForm.result === 'FAILED') setShowWriteoffHint(true)
                setVerForm({ verificationDate: '', result: 'PASSED', organization: '', nextVerificationDate: '' })
                instrumentApi.getVerifications(Number(id)).then((res) => setVerifications(res.data || []))
              }}>Сохранить</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* --- Ремонты --- */}
      {tab === 2 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setRepDlg(true)}>Добавить ремонт</Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата отправки</TableCell>
                <TableCell>Дата возврата</TableCell>
                <TableCell>Организация</TableCell>
                <TableCell>Описание</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repairs.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.sendDate}</TableCell>
                  <TableCell>{r.returnDate || '—'}</TableCell>
                  <TableCell>{r.organization}</TableCell>
                  <TableCell>{r.description}</TableCell>
                </TableRow>
              ))}
              {repairs.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">Нет записей</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <Dialog open={repDlg} onClose={() => setRepDlg(false)}>
            <DialogTitle>Добавить ремонт</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField label="Дата отправки" type="date" fullWidth margin="dense" slotProps={{ inputLabel: { shrink: true } }}
                value={repForm.sendDate} onChange={(e) => setRepForm({ ...repForm, sendDate: e.target.value })} />
              <TextField label="Организация" fullWidth margin="dense"
                value={repForm.organization} onChange={(e) => setRepForm({ ...repForm, organization: e.target.value })} />
              <TextField label="Описание" fullWidth margin="dense" multiline rows={2}
                value={repForm.description} onChange={(e) => setRepForm({ ...repForm, description: e.target.value })} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRepDlg(false)}>Отмена</Button>
              <Button variant="contained" onClick={async () => {
                await instrumentApi.addRepair(Number(id), repForm)
                setRepDlg(false)
                setRepForm({ sendDate: '', organization: '', description: '' })
                instrumentApi.getRepairs(Number(id)).then((res) => setRepairs(res.data || []))
              }}>Сохранить</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* --- Документы --- */}
      {tab === 3 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label">
              Загрузить документ
              <input type="file" hidden onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                await documentApi.upload(Number(id), file, 'OTHER')
                // Перезагрузить инструмент для обновления документов
                const res = await instrumentApi.getById(Number(id))
                setDocuments(res.data?.documents || [])
              }} />
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Тип</TableCell>
                <TableCell>Файл</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.type}</TableCell>
                  <TableCell>{d.filename}</TableCell>
                  <TableCell>{d.uploadDate || '—'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => window.open(documentApi.downloadUrl(d.id), '_blank')}>
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {documents.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">Нет документов</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* --- История изменений --- */}
      {tab === 4 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Действие</TableCell>
              <TableCell>Пользователь (ID)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((h: any) => (
              <TableRow key={h.id}>
                <TableCell>{new Date(h.createdAt).toLocaleString('ru-RU')}</TableCell>
                <TableCell>{h.action}</TableCell>
                <TableCell>{h.userId}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center">Нет записей</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
