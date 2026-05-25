import { useState } from 'react'
import {
  Box, Typography, Button, Stepper, Step, StepLabel, Alert, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, FormControl,
  Select, MenuItem, InputLabel,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { importApi } from '../services/api'

const steps = ['Загрузка файла', 'Соответствие колонок', 'Предварительный просмотр', 'Подтверждение']

// Поля для маппинга
const fieldOptions = [
  { value: '', label: '— пропустить —' },
  { value: 'name', label: 'Наименование' },
  { value: 'model', label: 'Модель' },
  { value: 'serialNumber', label: 'Серийный номер' },
  { value: 'inventoryNumber', label: 'Инвентарный номер' },
  { value: 'manufacturer', label: 'Производитель' },
  { value: 'status', label: 'Статус' },
  { value: 'verificationIntervalMonths', label: 'Интервал поверки (мес)' },
  { value: 'startDate', label: 'Дата ввода в эксплуатацию' },
]

export default function ImportPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [importId, setImportId] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [resolutions, setResolutions] = useState<Record<string, string>>({})

  // Шаг 1: загрузить файл → получить headers
  const handleUpload = async () => {
    if (!file) return
    setError('')
    try {
      const res = await importApi.upload(file)
      if (!res.success) throw new Error(res.message)
      setImportId(res.import_id)
      setHeaders(res.headers || [])
      // Автоматический маппинг по совпадению имён
      const auto: Record<string, string> = {}
      for (const h of (res.headers || [])) {
        const lower = h.toLowerCase()
        if (lower.includes('наименование') || lower.includes('прибор') || lower === 'name') auto[h] = 'name'
        else if (lower.includes('модель') || lower === 'model') auto[h] = 'model'
        else if (lower.includes('серийн') || lower === 'serialnumber') auto[h] = 'serialNumber'
        else if (lower.includes('инв') || lower === 'inventorynumber') auto[h] = 'inventoryNumber'
        else if (lower.includes('произв') || lower === 'manufacturer') auto[h] = 'manufacturer'
        else if (lower.includes('статус') || lower === 'status') auto[h] = 'status'
        else if (lower.includes('интервал') || lower.includes('interval')) auto[h] = 'verificationIntervalMonths'
        else auto[h] = ''
      }
      setMapping(auto)
      setActiveStep(1)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Шаг 2: отправить маппинг → preview
  const handleMapping = async () => {
    setError('')
    try {
      await importApi.updateMapping(importId, mapping)
      const prev = await importApi.preview(importId)
      setPreview(prev)
      const initRes: Record<string, string> = {}
      if (prev.data?.conflicts) {
        for (const c of prev.data.conflicts) {
          initRes[c.existing.id] = 'keep'
        }
      }
      setResolutions(initRes)
      setActiveStep(2)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Шаг 3: подтвердить импорт
  const handleCommit = async () => {
    setError('')
    try {
      const res = await importApi.commit(importId, resolutions)
      setResult(res)
      setActiveStep(3)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const reset = () => {
    setActiveStep(0); setFile(null); setHeaders([]); setMapping({})
    setPreview(null); setResult(null); setResolutions({})
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Импорт данных из XLSX</Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Шаг 0: Выбор файла */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3 }}>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            Выбрать файл
            <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          {file && <Typography sx={{ mt: 1 }}>{file.name}</Typography>}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" disabled={!file} onClick={handleUpload}>Загрузить</Button>
          </Box>
        </Paper>
      )}

      {/* Шаг 1: Соответствие колонок */}
      {activeStep === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Настройка соответствия колонок</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Колонка Excel</TableCell>
                <TableCell>Поле системы</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {headers.map((h) => (
                <TableRow key={h}>
                  <TableCell>{h}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Поле</InputLabel>
                      <Select
                        value={mapping[h] || ''}
                        label="Поле"
                        onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      >
                        {fieldOptions.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleMapping}>Далее</Button>
          </Box>
        </Paper>
      )}

      {/* Шаг 2: Предварительный просмотр */}
      {activeStep === 2 && preview && (
        <Paper sx={{ p: 3 }}>
          <Typography>Новых записей: <b>{preview.new_records}</b></Typography>
          <Typography>Обновлений: <b>{preview.updated_records}</b></Typography>
          <Typography>Конфликтов: <b>{preview.conflicts}</b></Typography>

          {preview.data?.conflicts?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Конфликты</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Инв. №</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Расхождения</TableCell>
                    <TableCell>Решение</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.data.conflicts.map((c: any) => (
                    <TableRow key={c.existing.id}>
                      <TableCell>{c.existing.inventoryNumber}</TableCell>
                      <TableCell>{c.existing.name}</TableCell>
                      <TableCell>
                        {c.diffs.map((d: string) => (
                          <Typography key={d} variant="caption" sx={{ display: 'block' }}>
                            <b>{d}:</b> «{String(c.existing[d] ?? '')}» → «{String(c.imported[d] ?? '')}»
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell>
                        <FormControl size="small">
                          <Select
                            value={resolutions[c.existing.id] || 'keep'}
                            onChange={(e) => setResolutions({ ...resolutions, [c.existing.id]: e.target.value })}
                          >
                            <MenuItem value="keep">Оставить текущие</MenuItem>
                            <MenuItem value="accept">Принять из файла</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleCommit}>Подтвердить импорт</Button>
          </Box>
        </Paper>
      )}

      {/* Шаг 3: Результат */}
      {activeStep === 3 && result && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="success">Импорт завершён!</Alert>
          <Typography sx={{ mt: 1 }}>Создано: {result.created}, обновлено: {result.updated}</Typography>
          <Button sx={{ mt: 2 }} onClick={reset}>Новый импорт</Button>
        </Paper>
      )}
    </Box>
  )
}
