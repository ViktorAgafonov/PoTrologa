import { useEffect, useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Stepper, Step, StepLabel, Alert, IconButton,
  List, ListItem, ListItemText,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SendIcon from '@mui/icons-material/Send'
import UploadIcon from '@mui/icons-material/Upload'
import PrintIcon from '@mui/icons-material/Print'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { writeoffApi, instrumentApi, templateApi, generateActUrl } from '../services/api'

// Шаги workflow
const STEPS = ['Черновик', 'Согласование', 'Ожидание скана', 'Завершено']

const statusStep: Record<string, number> = {
  DRAFT: 0, IN_APPROVAL: 1, WAITING_SCAN: 2, COMPLETED: 3, CANCELLED: -1,
}

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default', IN_APPROVAL: 'primary', WAITING_SCAN: 'warning',
  COMPLETED: 'success', CANCELLED: 'error',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик', IN_APPROVAL: 'На согласовании', WAITING_SCAN: 'Ожидание скана',
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
  const [responsible, setResponsible] = useState('')
  const [instruments, setInstruments] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Диалог согласования
  const [approvalDlg, setApprovalDlg] = useState(false)
  const [approverName, setApproverName] = useState('')
  const [approverPosition, setApproverPosition] = useState('')

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
    setResponsible('')
    setCreateDlg(true)
  }

  const handleCreate = async () => {
    setError('')
    if (!reason || selectedIds.length === 0) {
      setError('Укажите причину и выберите хотя бы одно СИ')
      return
    }
    await writeoffApi.create({ reason, responsiblePerson: responsible, instrumentIds: selectedIds })
    setCreateDlg(false)
    loadProcedures()
  }

  const openDetail = async (proc: any) => {
    const res = await writeoffApi.getById(proc.id)
    setSelected(res.data)
    templateApi.getAll().then((r) => setTemplates(r.data || []))
    setTab(1)
  }

  const handleSendToApproval = async () => {
    await writeoffApi.sendToApproval(selected.id)
    openDetail(selected)
    loadProcedures()
  }

  const handleAddApproval = async () => {
    if (!approverName || !approverPosition) return
    await writeoffApi.addApproval(selected.id, { approverName, approverPosition })
    setApprovalDlg(false)
    setApproverName('')
    setApproverPosition('')
    openDetail(selected)
  }

  const handleApprove = async (approvalId: number, approved: boolean) => {
    await writeoffApi.approve(approvalId, approved)
    openDetail(selected)
    loadProcedures()
  }

  const handleUploadScan = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      await writeoffApi.uploadScan(selected.id, file)
      openDetail(selected)
      loadProcedures()
    }
    input.click()
  }

  const handleCancel = async () => {
    await writeoffApi.cancel(selected.id)
    openDetail(selected)
    loadProcedures()
  }

  const handleGenerateAct = async (filename: string) => {
    const res = await fetch(generateActUrl(selected.id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ template: filename }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `act_${selected.procedureNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
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
            <Typography variant="subtitle1"><b>Ответственный:</b> {selected.responsiblePerson || '—'}</Typography>
            <Typography variant="subtitle1"><b>Статус:</b> {statusLabels[selected.status]}</Typography>
          </Paper>

          {/* Позиции */}
          <Typography variant="h6" sx={{ mb: 1 }}>Позиции для списания</Typography>
          <Paper sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID СИ</TableCell>
                  <TableCell>Примечание</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selected.items || []).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.instrumentId}</TableCell>
                    <TableCell>{item.note || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Согласования */}
          <Typography variant="h6" sx={{ mb: 1 }}>Согласования</Typography>
          <Paper sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ФИО</TableCell>
                  <TableCell>Должность</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Комментарий</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selected.approvals || []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.approverName}</TableCell>
                    <TableCell>{a.approverPosition}</TableCell>
                    <TableCell>
                      {a.approvedAt
                        ? <Chip label={a.approved ? 'Утверждено' : 'Отклонено'} size="small" color={a.approved ? 'success' : 'error'} />
                        : <Chip label="Ожидание" size="small" />}
                    </TableCell>
                    <TableCell>{a.comment || '—'}</TableCell>
                    <TableCell>{a.approvedAt ? new Date(a.approvedAt).toLocaleDateString('ru-RU') : '—'}</TableCell>
                    <TableCell>
                      {!a.approvedAt && selected.status === 'IN_APPROVAL' && (
                        <>
                          <IconButton size="small" color="success" onClick={() => handleApprove(a.id, true)}>
                            <CheckIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleApprove(a.id, false)}>
                            <CloseIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(selected.approvals || []).length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Нет согласований</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          {/* Шаблоны актов */}
          {templates.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>Шаблоны актов</Typography>
              <Paper sx={{ mb: 2 }}>
                <List dense>
                  {templates.map((t: any) => (
                    <ListItem key={t.filename} secondaryAction={
                      <IconButton edge="end" onClick={() => handleGenerateAct(t.filename)}>
                        <PrintIcon />
                      </IconButton>
                    }>
                      <ListItemText primary={t.filename} secondary={new Date(t.modified).toLocaleDateString('ru-RU')} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </>
          )}

          {/* Действия */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selected.status === 'DRAFT' && (
              <>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setApprovalDlg(true)}>
                  Добавить согласующего
                </Button>
                <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendToApproval}
                  disabled={(selected.approvals || []).length === 0}>
                  Отправить на согласование
                </Button>
              </>
            )}
            {selected.status === 'WAITING_SCAN' && (
              <Button variant="contained" startIcon={<UploadIcon />} onClick={handleUploadScan}>
                Загрузить скан акта
              </Button>
            )}
            {['DRAFT', 'IN_APPROVAL'].includes(selected.status) && (
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
          <TextField label="Ответственное лицо" fullWidth margin="dense"
            value={responsible} onChange={(e) => setResponsible(e.target.value)} />
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

      {/* Диалог добавления согласующего */}
      <Dialog open={approvalDlg} onClose={() => setApprovalDlg(false)}>
        <DialogTitle>Добавить согласующего</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField label="ФИО" fullWidth margin="dense"
            value={approverName} onChange={(e) => setApproverName(e.target.value)} />
          <TextField label="Должность" fullWidth margin="dense"
            value={approverPosition} onChange={(e) => setApproverPosition(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDlg(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleAddApproval}>Добавить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
