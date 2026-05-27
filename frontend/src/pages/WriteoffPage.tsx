import { useEffect, useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Stepper, Step, StepLabel, Alert, List, ListItem,
  ListItemButton, ListItemText, IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import UploadIcon from '@mui/icons-material/Upload'
import PrintIcon from '@mui/icons-material/Print'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import { writeoffApi, instrumentApi, templateApi, generateActUrl } from '../services/api'

// Шаги workflow (без согласования)
const STEPS = ['Черновик', 'Печать акта', 'Загрузка скана', 'Завершено']

const statusStep: Record<string, number> = {
  DRAFT: 0, WAITING_SCAN: 1, COMPLETED: 3, CANCELLED: -1,
}

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default', WAITING_SCAN: 'warning',
  COMPLETED: 'success', CANCELLED: 'error',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик', WAITING_SCAN: 'Ожидание скана',
  COMPLETED: 'Завершено', CANCELLED: 'Отменено',
}

export default function WriteoffPage() {
  const [tab, setTab] = useState(0)
  const [procedures, setProcedures] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [error, setError] = useState('')

  // Диалог создания
  const [createDlg, setCreateDlg] = useState(false)
  const [reason, setReason] = useState('')
  const [instruments, setInstruments] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Шаблоны
  const [templates, setTemplates] = useState<any[]>([])

  const loadProcedures = () => {
    writeoffApi.getAll().then((res) => setProcedures(res.data || []))
  }

  useEffect(() => { loadProcedures() }, [])

  const openCreate = async () => {
    const res = await instrumentApi.getAll({ page: '1', limit: '500' })
    setInstruments(res.items || [])
    setSelectedIds([])
    setReason('')
    setCreateDlg(true)
  }

  const handleCreate = async () => {
    setError('')
    if (!reason || selectedIds.length === 0) {
      setError('Укажите причину и выберите хотя бы одно СИ')
      return
    }
    await writeoffApi.create({ reason, instrumentIds: selectedIds })
    setCreateDlg(false)
    loadProcedures()
  }

  const openDetail = async (proc: any) => {
    const res = await writeoffApi.getById(proc.id)
    setSelected(res.data)
    templateApi.getAll().then((r) => setTemplates(r.data || []))
    setTab(1)
  }

  const handleUploadScan = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = async () => {
      const file = input.files?.[0]
      document.body.removeChild(input)
      if (!file) return
      try {
        await writeoffApi.uploadScan(selected.id, file, selected.procedureNumber)
        openDetail(selected)
        loadProcedures()
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки скана')
      }
    }
    input.click()
  }

  const handleCancel = async () => {
    await writeoffApi.cancel(selected.id)
    openDetail(selected)
    loadProcedures()
  }

  // Диалог выбора шаблона для печати
  const [printDlg, setPrintDlg] = useState(false)

  const openPrintDlg = () => {
    templateApi.getAll().then((r) => setTemplates(r.data || []))
    setPrintDlg(true)
  }

  const handlePrintAct = async (filename: string) => {
    // Экспорт акта
    const res = await fetch(generateActUrl(selected.id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ template: filename }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Ошибка генерации акта' }))
      alert(err.message || 'Ошибка генерации акта')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ext = filename.split('.').pop() || 'txt'
    a.download = `act_${selected.procedureNumber}.${ext}`
    a.click()
    URL.revokeObjectURL(url)

    // Перевести в WAITING_SCAN
    await writeoffApi.sendToApproval(selected.id)
    setPrintDlg(false)
    openDetail(selected)
    loadProcedures()
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Списание СИ</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Процедуры" />
        {selected && <Tab label={`Процедура ${selected.procedureNumber}`} />}
      </Tabs>

      {/* --- Список процедур --- */}
      {tab === 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Новая процедура
            </Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Номер</TableCell>
                  <TableCell>Причина</TableCell>
                  <TableCell>Позиций</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {procedures.map((p: any) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.procedureNumber}</TableCell>
                    <TableCell>{p.reason}</TableCell>
                    <TableCell>{p.items?.length || 0}</TableCell>
                    <TableCell>
                      <Chip label={statusLabels[p.status] || p.status} size="small" color={statusColors[p.status] || 'default'} />
                    </TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => openDetail(p)}>Открыть</Button>
                      {p.status === 'CANCELLED' && (
                        <IconButton size="small" color="error" title="Удалить" onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm(`Удалить процедуру ${p.procedureNumber}?`)) return
                          await writeoffApi.remove(p.id)
                          setSelected(null)
                          setTab(0)
                          loadProcedures()
                        }}><DeleteIcon fontSize="small" /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {procedures.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Нет процедур</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* --- Детали процедуры --- */}
      {tab === 1 && selected && (
        <Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stepper activeStep={statusStep[selected.status] ?? 0} sx={{ mb: 3 }}>
            {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {selected.status === 'CANCELLED' && (
            <Alert severity="error" sx={{ mb: 2 }}>Процедура отменена</Alert>
          )}

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1"><b>Номер:</b> {selected.procedureNumber}</Typography>
            <Typography variant="subtitle1"><b>Причина:</b> {selected.reason}</Typography>
            <Typography variant="subtitle1"><b>Статус:</b> {statusLabels[selected.status] || selected.status}</Typography>
          </Paper>

          {/* Позиции */}
          <Typography variant="h6" sx={{ mb: 1 }}>Позиции для списания</Typography>
          <Paper sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Инв.ном.СИ</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Примечание</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selected.items || []).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.instrument?.inventoryNumber || item.instrumentId}</TableCell>
                    <TableCell>{item.instrument?.name || '—'}</TableCell>
                    <TableCell>{item.note || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Документы */}
          {selected.scanDocument && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Загруженный документ:</Typography>
              <Typography variant="body1">
                <a href={`/api/v1/documents/${selected.scanDocument.id}`} target="_blank" rel="noopener noreferrer">
                  {selected.scanDocument.filename}
                </a>
              </Typography>
            </Paper>
          )}

          {/* Действия */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selected.status === 'DRAFT' && (
              <Button variant="contained" startIcon={<PrintIcon />} onClick={openPrintDlg}>
                Распечатать акт списания
              </Button>
            )}
            {selected.status === 'WAITING_SCAN' && (
              <Button variant="contained" startIcon={<UploadIcon />} onClick={handleUploadScan}>
                Загрузить скан подписанного акта
              </Button>
            )}
            {(selected.status === 'DRAFT' || selected.status === 'WAITING_SCAN') && (
              <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={handleCancel}>
                Отменить
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Диалог создания процедуры */}
      <Dialog open={createDlg} onClose={() => setCreateDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новая процедура списания</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <TextField label="Причина списания" fullWidth margin="dense" multiline rows={2}
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Выберите СИ для списания:</Typography>
          <Paper variant="outlined" sx={{ maxHeight: 250, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Инв. №</TableCell>
                  <TableCell>Название</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instruments.map((inst: any) => (
                  <TableRow key={inst.id} hover onClick={() => {
                    setSelectedIds(prev =>
                      prev.includes(inst.id) ? prev.filter(i => i !== inst.id) : [...prev, inst.id]
                    )
                  }} sx={{ cursor: 'pointer' }}>
                    <TableCell padding="checkbox">
                      <input type="checkbox" checked={selectedIds.includes(inst.id)} readOnly />
                    </TableCell>
                    <TableCell>{inst.inventoryNumber}</TableCell>
                    <TableCell>{inst.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDlg(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreate}>Создать</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог выбора шаблона для печати */}
      <Dialog open={printDlg} onClose={() => setPrintDlg(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Выберите шаблон акта</DialogTitle>
        <DialogContent>
          {templates.length === 0 ? (
            <Alert severity="info">Нет загруженных шаблонов. Добавьте шаблон в разделе «Шаблоны актов».</Alert>
          ) : (
            <List dense>
              {templates.map((t: any) => (
                <ListItem key={t.filename} disablePadding>
                  <ListItemButton onClick={() => handlePrintAct(t.filename)}>
                    <PrintIcon sx={{ mr: 1 }} fontSize="small" />
                    <ListItemText primary={t.filename} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDlg(false)}>Отмена</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
